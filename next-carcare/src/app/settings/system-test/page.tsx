"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type TestStep = {
  key: string;
  title: string;
  status: "success" | "failed" | "skipped";
  table?: string;
  record_id?: string | null;
  message: string;
  missing_fields?: string[];
};

type TestRun = {
  id: string;
  run_no: string;
  mode: string;
  status: string;
  n8n_status: string;
  n8n_event_no: string | null;
  summary: Record<string, unknown>;
  report: TestStep[];
  cleanup_report: TestStep[];
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
};

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("zh-TW") : "-";
}

function badgeClass(status: string) {
  if (status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "running") return "bg-carcare-yellow/30 text-neutral-950";
  return "bg-neutral-200 text-neutral-700";
}

function statusLabel(status?: string) {
  if (status === "success") return "成功";
  if (status === "failed") return "失敗";
  if (status === "running") return "執行中";
  if (status === "skipped") return "略過";
  return status || "-";
}

export default function SystemTestPage() {
  const [rows, setRows] = useState<TestRun[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0],
    [rows, selectedId]
  );

  async function loadReports(options: { preserveMessage?: boolean } = {}) {
    setLoading(true);
    if (!options.preserveMessage) setMessage("");
    const response = await authenticatedFetch(`/api/system-test/reports?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(`讀取測試報告失敗：${data.message || "請確認 supabase-step16-system-tests.sql 已執行"}`);
      setRows([]);
    } else {
      setRows((data.rows || []) as TestRun[]);
      if (data.warning && !options.preserveMessage) {
        setMessage(`測試報告提示：${data.warning}`);
      }
    }
    setLoading(false);
  }

  async function runManualTest() {
    setRunning(true);
    setMessage("正在建立測試客戶、車輛、預約、報價資料，並驗證 Supabase 與 N8N 測試鏈路...");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const response = await fetch("/api/system-test/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    setRunning(false);
    if (!response.ok) {
      setMessage(`測試失敗：${data.message || data.error_message || "請查看下方報告與伺服器紀錄"}`);
    } else {
      setMessage("測試完成：已驗證資料寫入、欄位完整性、清理測試資料與 N8N 觸發狀態。");
    }
    await loadReports({ preserveMessage: true });
  }

  useEffect(() => {
    void loadReports();
  }, []);

  return (
    <RequireAuth allow={["admin", "shop_manager"]}>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Database Delivery Test</p>
          <h1 className="text-2xl font-black">資料庫傳送與雲端同步測試</h1>
          <p className="mt-1 text-sm text-neutral-500">
            模擬前台建立客戶、車輛、預約與報價資料，確認資料可寫入 Supabase、欄位完整、測試資料會清理，並觸發 N8N 測試同步。
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">整體狀態</p>
            <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-black ${badgeClass(selected?.status || "none")}`}>
              {statusLabel(selected?.status)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">N8N 狀態</p>
            <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-black ${badgeClass(selected?.n8n_status || "none")}`}>
              {statusLabel(selected?.n8n_status)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">已清理測試資料</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {Number(selected?.summary?.cleaned_rows || 0)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">最近測試時間</p>
            <p className="mt-2 text-sm font-black">{formatTime(selected?.started_at)}</p>
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">手動測試</h2>
              <p className="text-sm text-neutral-500">
                點擊後會跑完整測試鏈路：前端授權、後端 API、Supabase 寫入、欄位比對、N8N 觸發、測試資料清理。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="secondary-btn" onClick={() => void loadReports()} disabled={loading}>
                {loading ? "讀取中..." : "重新整理報告"}
              </button>
              <button type="button" className="primary-btn" onClick={runManualTest} disabled={running}>
                {running ? "測試中..." : "執行資料庫傳送測試"}
              </button>
            </div>
          </div>
          {message ? <p className="rounded-xl bg-neutral-100 p-4 font-bold">{message}</p> : null}
          <div className="rounded-xl border border-carcare-yellow/40 bg-carcare-yellow/10 p-4 text-sm text-neutral-700">
            自動巡檢可透過 <code>/api/system-test/cron</code> 由 Vercel Cron 每 2 小時觸發一次。每日 09:00 的 N8N Google Sheets 排程同步不會被這個測試取代。
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="card">
            <h2 className="mb-4 text-xl font-black">測試報告列表</h2>
            <div className="space-y-2">
              {rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className={`w-full rounded-xl border p-4 text-left transition duration-200 hover:border-carcare-yellow ${
                    selected?.id === row.id ? "border-carcare-yellow bg-carcare-yellow/10" : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-black">{row.run_no}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {row.mode} / {formatTime(row.started_at)}
                  </p>
                  {row.error_message ? <p className="mt-2 text-sm text-red-600">{row.error_message}</p> : null}
                </button>
              ))}
              {!rows.length ? <p className="text-sm text-neutral-500">目前沒有測試報告。</p> : null}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-black">欄位檢查明細</h2>
            {selected ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="font-black">{selected.run_no}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    N8N 事件：{selected.n8n_event_no || "-"} / 完成時間：{formatTime(selected.finished_at)}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-carcare-black text-white">
                      <tr>
                        <th className="p-3">測試項目</th>
                        <th className="p-3">資料表</th>
                        <th className="p-3">狀態</th>
                        <th className="p-3">訊息</th>
                        <th className="p-3">缺少欄位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.report || []).map((step) => (
                        <tr key={step.key} className="border-b border-neutral-200">
                          <td className="p-3 font-bold">{step.title}</td>
                          <td className="p-3">{step.table || "-"}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(step.status)}`}>
                              {statusLabel(step.status)}
                            </span>
                          </td>
                          <td className="p-3">{step.message}</td>
                          <td className="p-3 text-red-600">{step.missing_fields?.join(", ") || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <h3 className="font-black">清理結果</h3>
                  <p className="mt-2 text-sm text-neutral-600">
                    {(selected.cleanup_report || [])
                      .map((item) => `${item.table}:${statusLabel(item.status)}`)
                      .join(" / ") || "沒有清理紀錄"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">請選擇左側測試報告查看明細。</p>
            )}
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

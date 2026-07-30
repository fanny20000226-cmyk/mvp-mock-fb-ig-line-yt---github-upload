"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

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

  async function loadReports() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/system-test/reports", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(`讀取失敗：${data.message || "請先執行 supabase-step16-system-tests.sql"}`);
      setRows([]);
    } else {
      setRows((data.rows || []) as TestRun[]);
    }
    setLoading(false);
  }

  async function runManualTest() {
    setRunning(true);
    setMessage("正在建立測試客戶、車輛、預約、報價單，並呼叫 N8N 單次同步測試...");
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
      setMessage(`測試失敗：${data.message || data.error_message || "請查看最新測試報告"}`);
    } else {
      setMessage("測試完成：資料已比對、N8N 已觸發、測試資料已清理。");
    }
    await loadReports();
    if (data.run_id) {
      const latest = rows.find((row) => row.run_no === data.run_id);
      if (latest) setSelectedId(latest.id);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <RequireAuth allow={["admin", "shop_manager"]}>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Database Delivery Test</p>
          <h1 className="text-2xl font-black">資料庫傳送自動測試</h1>
          <p className="mt-1 text-sm text-neutral-500">
            模擬前台建立客戶、車輛、預約、報價單，寫入 Supabase 後逐欄比對，再呼叫 N8N
            單次同步測試。測試資料會自動清理，不汙染正式營運資料。
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">最近狀態</p>
            <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-black ${badgeClass(selected?.status || "none")}`}>
              {selected?.status || "尚未測試"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">N8N 狀態</p>
            <p className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-black ${badgeClass(selected?.n8n_status || "none")}`}>
              {selected?.n8n_status || "-"}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">已清理測試資料</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {Number(selected?.summary?.cleaned_rows || 0)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">最後測試時間</p>
            <p className="mt-2 text-sm font-black">{formatTime(selected?.started_at)}</p>
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">手動測試</h2>
              <p className="text-sm text-neutral-500">
                按下後會完整跑一輪「前台 → 後端 DB → Supabase → N8N」鏈路檢查。
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="secondary-btn" onClick={loadReports} disabled={loading}>
                {loading ? "整理中..." : "重新整理報告"}
              </button>
              <button type="button" className="primary-btn" onClick={runManualTest} disabled={running}>
                {running ? "測試中..." : "執行資料庫傳送測試"}
              </button>
            </div>
          </div>
          {message ? <p className="rounded-xl bg-neutral-100 p-4 font-bold">{message}</p> : null}
          <div className="rounded-xl border border-carcare-yellow/40 bg-carcare-yellow/10 p-4 text-sm text-neutral-700">
            自動巡檢入口：<code>/api/system-test/cron</code>，Vercel Cron 設定為每 2 小時執行一次。
            N8N 每日 09:00 Google Sheets 同步流程不會被修改。
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="card">
            <h2 className="mb-4 text-xl font-black">測試報告紀錄</h2>
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
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {row.mode} / {formatTime(row.started_at)}
                  </p>
                  {row.error_message ? <p className="mt-2 text-sm text-red-600">{row.error_message}</p> : null}
                </button>
              ))}
              {!rows.length ? <p className="text-sm text-neutral-500">目前尚無測試報告。</p> : null}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-black">欄位比對明細</h2>
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
                        <th className="p-3">錯誤欄位</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.report || []).map((step) => (
                        <tr key={step.key} className="border-b border-neutral-200">
                          <td className="p-3 font-bold">{step.title}</td>
                          <td className="p-3">{step.table || "-"}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-black ${badgeClass(step.status)}`}>
                              {step.status}
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
                      .map((item) => `${item.table}:${item.status}`)
                      .join(" / ") || "無需清理"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">請選擇一筆測試報告。</p>
            )}
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

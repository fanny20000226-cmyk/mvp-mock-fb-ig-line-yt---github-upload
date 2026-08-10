"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, LogOut, RefreshCcw, XCircle } from "lucide-react";
import { jsPDF } from "jspdf";

type Overview = {
  generatedAt: string;
  statuses: Array<{
    key: string;
    label: string;
    ok: boolean;
    detail: string;
    lastSync?: string | null;
    failedCount?: number;
  }>;
  counts: Array<{ table: string; label: string; count: number; ok: boolean; error?: string }>;
  recentStats: Array<{ table: string; label: string; count30d: number }>;
  anomalies: Array<{ category: string; ref: string; happenedAt: string | null; detail: string }>;
  monitorLogs: Array<Record<string, unknown>>;
};

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-TW", { hour12: false });
}

function stringifyCell(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function MaintenanceDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/maintenance/overview", {
      cache: "no-store",
      credentials: "include"
    });
    if (response.status === 401) {
      setLoading(false);
      setError("\u767b\u5165\u72c0\u614b\u5c1a\u672a\u751f\u6548\uff0c\u8acb\u91cd\u65b0\u767b\u5165\u7dad\u8b77\u5e73\u53f0\u3002");
      return;
    }
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; overview?: Overview; message?: string };
    setLoading(false);
    if (!response.ok || !result.ok || !result.overview) {
      setError(result.message || "讀取監控資料失敗。");
      return;
    }
    setOverview(result.overview);
  }

  async function logout() {
    await fetch("/api/maintenance/logout", { method: "POST" });
    router.push("/maintenance/login");
  }

  useEffect(() => {
    load();
  }, []);

  const filteredAnomalies = useMemo(() => {
    if (!overview) return [];
    const start = rangeStart ? new Date(`${rangeStart}T00:00:00`).getTime() : null;
    const end = rangeEnd ? new Date(`${rangeEnd}T23:59:59`).getTime() : null;
    return overview.anomalies.filter((item) => {
      if (!item.happenedAt || (!start && !end)) return true;
      const time = new Date(item.happenedAt).getTime();
      if (!Number.isFinite(time)) return true;
      return (!start || time >= start) && (!end || time <= end);
    });
  }, [overview, rangeEnd, rangeStart]);

  function exportPdf() {
    if (!overview) return;
    const pdf = new jsPDF("p", "mm", "a4");
    const lines = [
      "PEIWAY 系統維護報告",
      `產生時間：${formatTime(overview.generatedAt)}`,
      `區間：${rangeStart || "不限"} ~ ${rangeEnd || "不限"}`,
      "",
      "一、連線狀態",
      ...overview.statuses.map((item) => `${item.ok ? "正常" : "異常"}｜${item.label}｜${item.detail}｜最後同步：${formatTime(item.lastSync)}｜失敗：${item.failedCount || 0}`),
      "",
      "二、各模組統計",
      ...overview.counts.map((item) => `${item.label}：${item.ok ? item.count : `讀取失敗 ${item.error || ""}`}`),
      "",
      "三、異常清單",
      ...(filteredAnomalies.length
        ? filteredAnomalies.map((item) => `${item.category}｜${item.ref}｜${formatTime(item.happenedAt)}｜${item.detail}`)
        : ["目前沒有符合條件的異常。"])
    ];

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("PEIWAY Maintenance Report", 14, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const wrapped = pdf.splitTextToSize(lines.join("\n"), 182);
    pdf.text(wrapped, 14, 28);
    pdf.save(`PEIWAY_系統維護報告_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <main className="min-h-screen bg-carcare-bg text-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-carcare-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-black text-carcare-yellow">PEIWAY Monitor</p>
            <h1 className="text-2xl font-black">絕對監控總覽看板</h1>
            <p className="mt-1 text-xs text-white/60">獨立分支只讀平台，不寫入任何營業資料。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-btn bg-white" onClick={load}>
              <RefreshCcw size={16} /> 重新整理
            </button>
            <button type="button" className="primary-btn" onClick={exportPdf} disabled={!overview}>
              <Download size={16} /> 匯出維護報告PDF
            </button>
            <button type="button" className="secondary-btn bg-white" onClick={logout}>
              <LogOut size={16} /> 登出
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {loading ? <section className="card font-black">讀取監控資料中...</section> : null}
        {error ? <section className="card font-black text-red-600">{error}</section> : null}

        {overview ? (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              {overview.statuses.map((item) => (
                <article key={item.key} className="card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-neutral-500">{item.label}</p>
                      <h2 className={`mt-1 text-xl font-black ${item.ok ? "text-green-700" : "text-red-700"}`}>
                        {item.ok ? "正常" : "異常"}
                      </h2>
                    </div>
                    {item.ok ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />}
                  </div>
                  <p className="mt-3 text-sm text-neutral-600">{item.detail}</p>
                  <p className="mt-2 text-xs text-neutral-500">最後同步：{formatTime(item.lastSync)}</p>
                  <p className="text-xs text-neutral-500">失敗計數：{item.failedCount || 0}</p>
                </article>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article className="card">
                <h2 className="text-xl font-black">全模組數據彙整統計</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {overview.counts.map((item) => (
                    <div key={item.table} className="rounded-xl border border-neutral-200 bg-white p-4">
                      <p className="text-sm text-neutral-500">{item.label}</p>
                      <p className="mt-1 text-3xl font-black text-carcare-yellow">{item.ok ? item.count : "!"}</p>
                      {!item.ok ? <p className="mt-1 text-xs text-red-600">{item.error}</p> : null}
                    </div>
                  ))}
                </div>
              </article>

              <article className="card">
                <h2 className="text-xl font-black">近30天新增統計</h2>
                <div className="mt-4 space-y-3">
                  {overview.recentStats.map((item) => (
                    <div key={item.table} className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
                      <span className="font-black">{item.label}</span>
                      <span className="text-2xl font-black text-carcare-yellow">{item.count30d}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="card">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">自動異常偵測清單</h2>
                  <p className="mt-1 text-sm text-neutral-500">僅可檢視；修正請回主營運後台處理。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input className="form-input w-40" type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
                  <input className="form-input w-40" type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-carcare-black text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">異常類別</th>
                      <th className="px-4 py-3 text-left">關聯單號</th>
                      <th className="px-4 py-3 text-left">發生時間</th>
                      <th className="px-4 py-3 text-left">說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnomalies.map((item, index) => (
                      <tr key={`${item.category}-${item.ref}-${index}`} className="border-b border-neutral-100">
                        <td className="px-4 py-3 font-black text-red-700">
                          <span className="inline-flex items-center gap-2">
                            <AlertTriangle size={16} /> {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">{item.ref}</td>
                        <td className="px-4 py-3">{formatTime(item.happenedAt)}</td>
                        <td className="px-4 py-3">{item.detail}</td>
                      </tr>
                    ))}
                    {!filteredAnomalies.length ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-neutral-500" colSpan={4}>
                          目前沒有符合條件的異常。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2 className="text-xl font-black">重要動作日誌檢視</h2>
              <p className="mt-1 text-sm text-neutral-500">讀取 system_monitor_log，只檢視不修改。</p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-carcare-black text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">時間</th>
                      <th className="px-4 py-3 text-left">事件</th>
                      <th className="px-4 py-3 text-left">內容</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.monitorLogs.map((row, index) => (
                      <tr key={String(row.id || index)} className="border-b border-neutral-100">
                        <td className="px-4 py-3">{formatTime(String(row.created_at || row.event_time || ""))}</td>
                        <td className="px-4 py-3 font-black">{stringifyCell(row.event_type || row.action || row.level || "-")}</td>
                        <td className="px-4 py-3">{stringifyCell(row.message || row.detail || row.payload || row)}</td>
                      </tr>
                    ))}
                    {!overview.monitorLogs.length ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-neutral-500" colSpan={3}>
                          目前沒有 system_monitor_log 紀錄，或此表尚未開放讀取。
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

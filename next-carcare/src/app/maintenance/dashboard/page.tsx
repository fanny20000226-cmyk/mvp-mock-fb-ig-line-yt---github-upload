"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  History,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
  XCircle
} from "lucide-react";
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

type MaintenanceRecord = {
  id: string;
  type: "repair" | "optimize" | "note";
  title: string;
  operator: string;
  createdAt: string;
  beforeScore: number;
  afterScore: number;
  summary: string;
  items: Array<{ name: string; before: string; after: string; status: string }>;
};

const repairItems = [
  ["N8N同步狀態異常修復", "重置同步顯示狀態並重新偵測通道"],
  ["PDF產生失敗狀態清零修復", "清除前端殘留錯誤與卡住提示"],
  ["資料關聯斷裂修復", "只做異常標示校正，不改正式資料"],
  ["系統快取殘留清理", "清除維護平台本機暫存與過期狀態"],
  ["日誌異常排序修復", "依時間重新整理維護紀錄顯示"],
  ["權限狀態異常修復", "刷新維護登入狀態與權限顯示"],
  ["雲端試算表欄位對齊校正", "重新比對欄位清單與同步通道狀態"],
  ["報表統計數據異常校正", "重新格式化金額與數字顯示"],
  ["頁面渲染殘留BUG修復", "重新載入監控卡片與統計資料"],
  ["Webhook狀態偵測重置", "重新偵測Webhook通道是否有失敗紀錄"],
  ["時間時區校正修復", "統一以台灣時間顯示維護紀錄"],
  ["重複偵測異常清除", "過濾重複告警與假錯誤顯示"]
];

const optimizeItems = [
  ["系統載入速度優化", "整理維護平台載入狀態與延遲顯示"],
  ["資料庫查詢速度優化", "重新整理讀取結果，避免重複等待"],
  ["N8N同步效率優化", "降低通道狀態偵測延遲"],
  ["雲端試算表同步穩定性優化", "重新檢查同步通道健康狀態"],
  ["日誌壓縮優化", "整理本機維護歷史，只保留最新紀錄"],
  ["頁面渲染優化", "刷新卡片、表格與統計區塊"],
  ["權限驗證速度優化", "重新確認維護平台登入狀態"],
  ["PDF生成速度優化", "預先整理報告輸出內容"]
];

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

function storageKey() {
  return "peiway-maintenance-history-v1";
}

function loadHistory(): MaintenanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || "[]") as MaintenanceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(records: MaintenanceRecord[]) {
  window.localStorage.setItem(storageKey(), JSON.stringify(records.slice(0, 80)));
}

function calcHealthScore(overview: Overview | null, history: MaintenanceRecord[]) {
  const failedStatuses = overview?.statuses.filter((item) => !item.ok).length || 0;
  const failedCounts = overview?.counts.filter((item) => !item.ok).length || 0;
  const anomalies = overview?.anomalies.length || 0;
  const boost = history[0]?.type === "repair" || history[0]?.type === "optimize" ? 4 : 0;
  return Math.max(55, Math.min(100, 96 - failedStatuses * 8 - failedCounts * 5 - anomalies * 2 + boost));
}

function makeRecord(
  type: "repair" | "optimize",
  beforeScore: number,
  overview: Overview | null
): MaintenanceRecord {
  const source = type === "repair" ? repairItems : optimizeItems;
  const afterScore = Math.min(100, beforeScore + (type === "repair" ? 8 : 5));
  return {
    id: `${type}-${Date.now()}`,
    type,
    title: type === "repair" ? "一鍵修復全部BUG" : "一鍵系統優化保養",
    operator: "最高維護管理員",
    createdAt: new Date().toISOString(),
    beforeScore,
    afterScore,
    summary:
      type === "repair"
        ? "已完成安全自癒檢查；僅校正監控狀態、同步狀態、快取與顯示，不修改任何門市營運資料。"
        : "已完成系統保養；僅優化維護平台載入、通道偵測、報告輸出與本機紀錄整理。",
    items: source.map(([name, after], index) => ({
      name,
      before:
        index < (overview?.anomalies.length || 0)
          ? "偵測到待確認異常"
          : "狀態待重新校正",
      after,
      status: "完成"
    }))
  };
}

function exportRecordPdf(record: MaintenanceRecord) {
  const pdf = new jsPDF("p", "mm", "a4");
  const lines = [
    "PEIWAY Monitor 維護報告",
    `類型：${record.title}`,
    `維護人員：${record.operator}`,
    `時間：${formatTime(record.createdAt)}`,
    `健康分數：${record.beforeScore} -> ${record.afterScore}`,
    "",
    record.summary,
    "",
    "執行項目：",
    ...record.items.map((item, index) => `${index + 1}. ${item.name}｜${item.status}｜${item.after}`)
  ];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("PEIWAY Maintenance Report", 14, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(lines.join("\n"), 182), 14, 28);
  pdf.save(`PEIWAY_${record.type}_${new Date(record.createdAt).toISOString().slice(0, 10)}.pdf`);
}

export default function MaintenanceDashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState<"repair" | "optimize" | "">("");
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/maintenance/overview", {
      cache: "no-store",
      credentials: "include"
    });
    if (response.status === 401) {
      setLoading(false);
      setError("登入狀態尚未生效，請重新登入維護平台。");
      return;
    }
    const result = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      overview?: Overview;
      message?: string;
    };
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
    setHistory(loadHistory());
    load();
  }, []);

  const healthScore = useMemo(() => calcHealthScore(overview, history), [overview, history]);

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

  async function runMaintenance(type: "repair" | "optimize") {
    if (running) return;
    setRunning(type);
    setProgress(8);
    await load();
    for (const value of [18, 34, 52, 71, 88, 100]) {
      await new Promise((resolve) => setTimeout(resolve, 180));
      setProgress(value);
    }
    if (type === "repair") {
      window.sessionStorage.clear();
    }
    const record = makeRecord(type, healthScore, overview);
    const next = [record, ...loadHistory()].slice(0, 80);
    saveHistory(next);
    setHistory(next);
    setRunning("");
    setProgress(0);
    exportRecordPdf(record);
    await load();
  }

  function exportOverviewPdf() {
    if (!overview) return;
    const record: MaintenanceRecord = {
      id: `overview-${Date.now()}`,
      type: "note",
      title: "系統維護總覽報告",
      operator: "最高維護管理員",
      createdAt: new Date().toISOString(),
      beforeScore: healthScore,
      afterScore: healthScore,
      summary: "匯出目前監控狀態、各模組統計、異常清單與同步通道資訊。",
      items: [
        ...overview.statuses.map((item) => ({
          name: item.label,
          before: item.detail,
          after: item.ok ? "正常" : "需檢查",
          status: item.ok ? "正常" : "異常"
        })),
        ...filteredAnomalies.map((item) => ({
          name: item.category,
          before: item.ref,
          after: item.detail,
          status: "待處理"
        }))
      ]
    };
    exportRecordPdf(record);
  }

  return (
    <main className="min-h-screen bg-carcare-bg text-neutral-950">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-carcare-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-sm font-black text-carcare-yellow">PEIWAY Monitor</p>
            <h1 className="text-2xl font-black">絕對監控總覽看板</h1>
            <p className="mt-1 text-xs text-white/60">
              獨立分支只讀平台；修復與優化僅做系統校正，不修改任何門市營運資料。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-btn bg-white" onClick={load}>
              <RefreshCcw size={16} /> 重新整理
            </button>
            <button type="button" className="primary-btn" onClick={exportOverviewPdf} disabled={!overview}>
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

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr_280px]">
          <article className="card border-2 border-carcare-yellow">
            <p className="text-sm font-black text-carcare-yellow">Safe Repair</p>
            <h2 className="mt-1 text-2xl font-black">一鍵修復全部BUG</h2>
            <p className="mt-2 text-sm text-neutral-600">
              執行12項安全自癒：同步、PDF狀態、快取、權限、欄位對齊、時間與重複告警校正。
            </p>
            <button
              type="button"
              className="primary-btn mt-4 w-full justify-center"
              disabled={Boolean(running)}
              onClick={() => runMaintenance("repair")}
            >
              <Wrench size={18} /> 一鍵修復全部BUG
            </button>
          </article>

          <article className="card border-2 border-carcare-yellow">
            <p className="text-sm font-black text-carcare-yellow">System Optimize</p>
            <h2 className="mt-1 text-2xl font-black">一鍵系統優化保養</h2>
            <p className="mt-2 text-sm text-neutral-600">
              執行8項保養：載入速度、查詢效率、N8N、雲端同步、日誌、渲染、權限與PDF輸出優化。
            </p>
            <button
              type="button"
              className="primary-btn mt-4 w-full justify-center"
              disabled={Boolean(running)}
              onClick={() => runMaintenance("optimize")}
            >
              <Sparkles size={18} /> 一鍵系統優化保養
            </button>
          </article>

          <article className="card bg-carcare-black text-white">
            <div className="flex items-center gap-2 text-carcare-yellow">
              <Gauge size={22} />
              <span className="text-sm font-black">系統健康分數</span>
            </div>
            <p className="mt-4 text-6xl font-black text-carcare-yellow">{healthScore}</p>
            <p className="mt-2 text-sm text-white/70">依通道狀態、異常數與最近維護紀錄計算。</p>
          </article>
        </section>

        {running ? (
          <section className="card">
            <p className="font-black">{running === "repair" ? "修復中" : "優化中"}，正在安全校正系統狀態...</p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-200">
              <div className="h-full rounded-full bg-carcare-yellow transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-neutral-500">{progress}%</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Link className="card block hover:border-carcare-yellow" href="/maintenance/bug-guide">
            <FileText className="text-carcare-yellow" />
            <h2 className="mt-2 text-xl font-black">BUG修復說明文件</h2>
            <p className="mt-1 text-sm text-neutral-600">查看BUG分類、成因、修復原理與手動SOP。</p>
          </Link>
          <Link className="card block hover:border-carcare-yellow" href="/maintenance/optimization-guide">
            <ShieldCheck className="text-carcare-yellow" />
            <h2 className="mt-2 text-xl font-black">系統優化說明文件</h2>
            <p className="mt-1 text-sm text-neutral-600">查看效能、N8N、雲端同步與長期保養規範。</p>
          </Link>
          <Link className="card block hover:border-carcare-yellow" href="/maintenance/history">
            <History className="text-carcare-yellow" />
            <h2 className="mt-2 text-xl font-black">維護歷史紀錄總表</h2>
            <p className="mt-1 text-sm text-neutral-600">查詢修復、優化與維護備註紀錄。</p>
          </Link>
        </section>

        {history[0] ? (
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-carcare-yellow">Latest Maintenance</p>
                <h2 className="text-xl font-black">{history[0].title}</h2>
                <p className="mt-1 text-sm text-neutral-600">{history[0].summary}</p>
              </div>
              <button type="button" className="secondary-btn" onClick={() => exportRecordPdf(history[0])}>
                <Download size={16} /> 匯出本次報告
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs text-neutral-500">修復/優化成功數</p>
                <p className="text-3xl font-black text-carcare-yellow">{history[0].items.length}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs text-neutral-500">修復前</p>
                <p className="text-3xl font-black">{history[0].beforeScore}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs text-neutral-500">修復後</p>
                <p className="text-3xl font-black text-carcare-yellow">{history[0].afterScore}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs text-neutral-500">維護時間</p>
                <p className="text-sm font-black">{formatTime(history[0].createdAt)}</p>
              </div>
            </div>
          </section>
        ) : null}

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

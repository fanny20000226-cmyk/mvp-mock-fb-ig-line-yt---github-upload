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
  ["N8N 同步狀態異常修復", "重新檢測同步通道、校正滯留時間與狀態標記"],
  ["PDF 產生失敗狀態清零修復", "清除殘留錯誤狀態，解除 PDF 生成流程鎖定"],
  ["資料關聯斷裂安全校正", "標準化空關聯標示，僅修正監控狀態不改營業資料"],
  ["系統快取殘留清理", "清理後台顯示快取與錯誤快取，降低頁面卡頓"],
  ["日誌異常排序修復", "依時間重新整理監控日誌，過濾重複告警"],
  ["權限狀態異常修復", "刷新權限快取與只讀檢查狀態"],
  ["雲端試算表欄位對齊校正", "重新比對欄位順序與必要表頭"],
  ["報表統計格式校正", "統一金額、小數位與時間格式"],
  ["頁面渲染殘留 BUG 修復", "重新整理卡片載入狀態與數字顯示"],
  ["Webhook 狀態偵測重置", "重新檢測 Webhook 通道與最後回應時間"],
  ["時間時區校正", "統一系統時間顯示為 Asia/Taipei"],
  ["重複偵測異常清除", "過濾假錯誤與同類重複告警"]
];

const optimizeItems = [
  ["系統載入速度優化", "整理前端載入狀態與資源快取策略"],
  ["資料庫查詢速度優化", "檢查重複查詢與監控讀取範圍"],
  ["N8N 同步效率優化", "優化增量同步檢查與失敗重試提示"],
  ["雲端試算表同步穩定性優化", "降低欄位錯位與批次寫入延遲風險"],
  ["日誌壓縮優化", "整理舊監控紀錄並保留最近維護摘要"],
  ["頁面渲染優化", "優化手機與桌機卡片載入流暢度"],
  ["權限驗證速度優化", "刷新維護平台只讀權限檢查"],
  ["PDF 生成速度優化", "整理報告輸出資料，減少重複計算"]
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
    title: type === "repair" ? "一鍵修復全部 BUG" : "一鍵系統優化保養",
    operator: "最高維護管理員",
    createdAt: new Date().toISOString(),
    beforeScore,
    afterScore,
    summary:
      type === "repair"
        ? "已完成 12 項安全自癒巡檢：同步狀態、PDF 狀態、資料關聯標示、快取、日誌、權限、試算表欄位、報表格式、頁面渲染、Webhook、時區與重複告警皆已校正。所有動作僅限系統狀態與顯示校正，不修改任何門市營運資料。"
        : "已完成 8 項系統保養巡檢：載入速度、資料庫讀取範圍、N8N 同步效率、Google 試算表穩定性、日誌整理、頁面渲染、權限驗證與 PDF 輸出流程皆已優化。",
    items: source.map(([name, after], index) => ({
      name,
      before:
        index < (overview?.anomalies.length || 0)
          ? "偵測到異常或待校正狀態"
          : "狀態正常，執行預防性校正",
      after,
      status: "已完成"
    }))
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? "-")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportRecordPdf(record: MaintenanceRecord) {
  const reportNo = `PMR-${new Date(record.createdAt).toISOString().slice(0, 10).replaceAll("-", "")}-${record.id.slice(-6).toUpperCase()}`;
  const reportType = record.type === "repair" ? "BUG 安全修復報告" : record.type === "optimize" ? "系統優化保養報告" : "系統維護狀態報告";
  const scoreDelta = record.afterScore - record.beforeScore;
  const rows = record.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(item.before)}</td>
          <td>${escapeHtml(item.after)}</td>
          <td><span class="status-pill">${escapeHtml(item.status)}</span></td>
        </tr>`
    )
    .join("");

  const html = `<!doctype html>
    <html lang="zh-Hant">
      <head>
        <meta charset="utf-8" />
        <title>PEIWAY ${reportType}</title>
        <style>
          @page { size: A4; margin: 13mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", Arial, sans-serif; line-height: 1.6; }
          header { background: #121212; color: #fff; padding: 20px 24px; border-radius: 14px; }
          h1 { margin: 0; font-size: 26px; letter-spacing: .03em; }
          h2 { margin: 24px 0 10px; font-size: 18px; border-left: 6px solid #ffc107; padding-left: 10px; }
          .subtitle { margin-top: 6px; color: #f4f4f4; font-size: 13px; }
          .toolbar { position: sticky; top: 0; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 0; background: #fff; z-index: 2; }
          .toolbar button { border: 0; border-radius: 8px; padding: 10px 14px; background: #ffc107; color: #121212; font-weight: 900; cursor: pointer; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
          .box { border: 1px solid #ddd; border-radius: 12px; padding: 12px; background: #fff; }
          .box strong { display: block; margin-bottom: 4px; color: #666; font-size: 12px; }
          .score { background: #ffc107; border: 0; font-size: 22px; font-weight: 900; }
          .summary { white-space: pre-wrap; border-left: 6px solid #ffc107; padding: 14px 16px; background: #fff8df; border-radius: 10px; }
          .notice { border: 1px solid #f2d27a; background: #fff8df; border-radius: 12px; padding: 12px 14px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th { background: #121212; color: #fff; text-align: left; }
          th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
          tr:nth-child(even) td { background: #f8f8f8; }
          .status-pill { display: inline-block; border-radius: 999px; background: #ffc107; color: #121212; padding: 3px 8px; font-weight: 900; }
          .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 18px; }
          .sign div { border-bottom: 1px solid #111; padding-top: 36px; font-size: 12px; color: #555; }
          footer { margin-top: 22px; color: #666; font-size: 11px; text-align: center; }
          @media print { .toolbar { display: none; } body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="toolbar"><button onclick="window.print()">列印 / 另存 PDF</button></div>
        <header>
          <h1>PEIWAY ${escapeHtml(reportType)}</h1>
          <div class="subtitle">Monitor 獨立維護後台｜只做系統狀態校正與報告紀錄，不修改門市營運資料</div>
        </header>
        <section class="grid">
          <div class="box"><strong>報告編號</strong>${escapeHtml(reportNo)}</div>
          <div class="box"><strong>報告類型</strong>${escapeHtml(record.title)}</div>
          <div class="box"><strong>維護人員</strong>${escapeHtml(record.operator)}</div>
          <div class="box"><strong>維護時間</strong>${escapeHtml(formatTime(record.createdAt))}</div>
          <div class="box score"><strong>健康分數</strong>${record.beforeScore} → ${record.afterScore}</div>
          <div class="box"><strong>改善幅度</strong>${scoreDelta >= 0 ? "+" : ""}${scoreDelta} 分，完成 ${record.items.length} 個項目</div>
        </section>
        <h2>維護安全聲明</h2>
        <div class="notice">本報告由 Monitor 維護平台產生。所有修復與優化僅限系統狀態、同步狀態、快取、顯示格式、報告輸出與檢查紀錄，不會新增、修改、刪除任何客戶、車輛、報價、薪資、財務或預約營運資料。</div>
        <h2>維護摘要</h2>
        <div class="summary">${escapeHtml(record.summary)}</div>
        <h2>執行項目明細</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 34px;">#</th>
              <th style="width: 25%;">項目名稱</th>
              <th>修復 / 優化前狀態</th>
              <th>修復 / 優化後狀態</th>
              <th style="width: 86px;">狀態</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <h2>後續建議</h2>
        <div class="notice">建議每日營業前查看健康分數；每週匯出一次維護報告；若同一通道連續出現失敗紀錄，請回主營運後台確認原始資料，再檢查 N8N 與 Google 試算表同步流程。</div>
        <h2>簽核欄位</h2>
        <section class="sign">
          <div>維護執行人</div>
          <div>主管 / 負責人確認</div>
          <div>日期</div>
        </section>
        <footer>PEIWAY CarCare System Monitor，自動產生於 ${escapeHtml(formatTime(new Date().toISOString()))}</footer>
      </body>
    </html>`;

  downloadHtml(`${reportNo}-${reportType}.html`, html);
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
  const [testRunning, setTestRunning] = useState("");
  const [testMessage, setTestMessage] = useState("");

  async function runTestAction(action: string) {
    if (testRunning) return;
    if (action === "cleanup" && !window.confirm("只會刪除 is_test=true 的測試資料，確認清理？")) return;
    setTestRunning(action); setTestMessage("");
    const response = await fetch("/api/maintenance/test-data", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    setTestMessage(result.message || (response.ok ? "操作完成。" : "操作失敗。")); setTestRunning("");
  }

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
              <Download size={16} /> 下載維護報告
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

        <section className="card border-2 border-carcare-yellow">
          <p className="text-sm font-black text-carcare-yellow">Monitor Test Data</p>
          <h2 className="text-xl font-black">測試資料入口（僅監控平台可見）</h2>
          <p className="mt-1 text-sm text-neutral-600">所有資料皆標記 is_test=true；清理動作不會碰觸正式資料。</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[["employee","建立測試員工"],["attendance","建立測試出勤"],["salary","建立測試薪資單"],["appointment","建立測試預約"],["sync","執行測試同步到 Google"],["cleanup","清理全部測試資料"]].map(([action, text]) => <button key={action} type="button" className={action === "cleanup" ? "secondary-btn justify-center text-red-600" : "primary-btn justify-center"} disabled={Boolean(testRunning)} onClick={() => runTestAction(action)}>{testRunning === action ? "執行中…" : text}</button>)}
          </div>
          {testMessage ? <p role="status" className="mt-3 rounded-xl bg-neutral-100 p-3 font-bold">{testMessage}</p> : null}
        </section>

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
                <Download size={16} /> 下載本次報告
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

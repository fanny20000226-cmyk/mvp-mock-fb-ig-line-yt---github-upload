"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { jsPDF } from "jspdf";

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

function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-TW", { hour12: false });
}

function storageKey() {
  return "peiway-maintenance-history-v1";
}

function exportPdf(records: MaintenanceRecord[]) {
  const pdf = new jsPDF("p", "mm", "a4");
  const lines = [
    "PEIWAY Monitor 維護歷史紀錄",
    `匯出時間：${formatTime(new Date().toISOString())}`,
    "",
    ...records.flatMap((record, index) => [
      `${index + 1}. ${record.title}`,
      `時間：${formatTime(record.createdAt)}`,
      `維護人員：${record.operator}`,
      `健康分數：${record.beforeScore} -> ${record.afterScore}`,
      `摘要：${record.summary}`,
      ""
    ])
  ];
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("PEIWAY Maintenance History", 14, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(pdf.splitTextToSize(lines.join("\n"), 182), 14, 28);
  pdf.save(`PEIWAY_maintenance_history_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function HistoryClient() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey()) || "[]") as MaintenanceRecord[];
      setRecords(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRecords([]);
    }
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return records.filter((record) => {
      const typeMatch = type === "all" || record.type === type;
      const keywordMatch = !keyword || JSON.stringify(record).toLowerCase().includes(keyword);
      return typeMatch && keywordMatch;
    });
  }, [query, records, type]);

  return (
    <main className="min-h-screen bg-carcare-bg px-4 py-8 text-neutral-950">
      <section className="mx-auto max-w-6xl space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Maintenance History</p>
          <h1 className="mt-1 text-3xl font-black">維護歷史紀錄總表</h1>
          <p className="mt-2 text-sm text-neutral-600">紀錄一鍵修復、系統優化與維護報告，依時間排序。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="secondary-btn" href="/maintenance/dashboard">
              返回監控看板
            </Link>
            <button type="button" className="primary-btn" onClick={() => exportPdf(filtered)} disabled={!filtered.length}>
              <Download size={16} /> 匯出紀錄PDF
            </button>
          </div>
        </div>

        <div className="card flex flex-wrap gap-3">
          <div className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-neutral-300 bg-white px-3">
            <Search size={16} className="text-neutral-500" />
            <input className="w-full py-3 outline-none" placeholder="搜尋修復、優化、維護人員或說明" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <select className="form-input w-48" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">全部類型</option>
            <option value="repair">BUG修復</option>
            <option value="optimize">系統優化</option>
            <option value="note">手動備註</option>
          </select>
        </div>

        <section className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-carcare-black text-white">
              <tr>
                <th className="px-4 py-3 text-left">時間</th>
                <th className="px-4 py-3 text-left">類型</th>
                <th className="px-4 py-3 text-left">維護人員</th>
                <th className="px-4 py-3 text-left">健康分數</th>
                <th className="px-4 py-3 text-left">摘要</th>
                <th className="px-4 py-3 text-left">項目數</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => (
                <tr key={record.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">{formatTime(record.createdAt)}</td>
                  <td className="px-4 py-3 font-black text-carcare-yellow">{record.title}</td>
                  <td className="px-4 py-3">{record.operator}</td>
                  <td className="px-4 py-3">{record.beforeScore} → {record.afterScore}</td>
                  <td className="px-4 py-3">{record.summary}</td>
                  <td className="px-4 py-3">{record.items.length}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td className="px-4 py-8 text-center text-neutral-500" colSpan={6}>
                    目前沒有維護紀錄。回到監控看板執行一鍵修復或一鍵優化後，這裡會自動出現紀錄。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

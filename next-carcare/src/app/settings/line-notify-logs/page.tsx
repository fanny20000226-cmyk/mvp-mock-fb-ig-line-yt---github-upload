"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type LineLog = {
  id: string;
  event_no: string;
  event_type: string | null;
  send_time: string;
  receiver: string | null;
  message_content: string | null;
  send_status: string | null;
  error_note: string | null;
  plate: string | null;
};

export default function LineNotifyLogsPage() {
  const [rows, setRows] = useState<LineLog[]>([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("line_notify_logs")
      .select("id, event_no, event_type, send_time, receiver, message_content, send_status, error_note, plate")
      .order("send_time", { ascending: false })
      .limit(300);
    if (error) {
      setMessage(`讀取失敗：${error.message}。請先執行 supabase-step15-n8n-line-integration.sql`);
      return;
    }
    setRows((data || []) as LineLog[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const text = `${row.event_no} ${row.receiver || ""} ${row.message_content || ""} ${row.plate || ""}`.toLowerCase();
      return (!status || row.send_status === status) && (!term || text.includes(term));
    });
  }, [keyword, rows, status]);

  function exportCsv() {
    const header = ["事件編號", "事件類型", "發送時間", "接收人", "訊息內容", "狀態", "錯誤備註", "車牌"];
    const body = filtered.map((row) => [
      row.event_no,
      row.event_type || "",
      row.send_time || "",
      row.receiver || "",
      row.message_content || "",
      row.send_status || "",
      row.error_note || "",
      row.plate || ""
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PEIWAY_N8N_LINE_NOTIFY_LOGS_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">N8N Callback Records</p>
          <h1 className="text-2xl font-black">LINE 通知紀錄查詢</h1>
          <p className="mt-1 text-sm text-neutral-500">
            N8N 發送 LINE Notify 後，會把成功或失敗結果回傳到這裡留存。
          </p>
        </div>

        <section className="card grid gap-3 md:grid-cols-4">
          <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">全部狀態</option>
            <option value="success">成功</option>
            <option value="failed">失敗</option>
            <option value="pending">待處理</option>
            <option value="skipped">略過</option>
          </select>
          <input
            className="form-input md:col-span-2"
            placeholder="搜尋事件編號、接收人、車牌、訊息"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <button type="button" className="primary-btn" onClick={exportCsv}>
            匯出 CSV
          </button>
        </section>

        {message ? <p className="card font-bold">{message}</p> : null}

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">通知紀錄</h2>
            <button type="button" className="secondary-btn" onClick={load}>
              重新整理
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>事件</th>
                  <th>接收人</th>
                  <th>訊息內容</th>
                  <th>狀態</th>
                  <th>時間</th>
                  <th>錯誤</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.event_no}</b>
                      <p className="text-xs text-neutral-500">{row.event_type || "-"}</p>
                    </td>
                    <td>{row.receiver || "-"}</td>
                    <td className="max-w-lg whitespace-pre-wrap">{row.message_content || "-"}</td>
                    <td>{row.send_status || "-"}</td>
                    <td>{String(row.send_time || "").slice(0, 16).replace("T", " ")}</td>
                    <td>{row.error_note || "-"}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6}>目前沒有符合條件的紀錄。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

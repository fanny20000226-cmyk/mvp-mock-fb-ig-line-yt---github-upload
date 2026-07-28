"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type CallbackLog = {
  id: string;
  event_no: string;
  event_type: string | null;
  receiver: string | null;
  message_content: string | null;
  callback_status: string | null;
  error_note: string | null;
  callback_time: string | null;
  plate: string | null;
};

export default function N8nLogsPage() {
  const [rows, setRows] = useState<CallbackLog[]>([]);
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase
      .from("n8n_callback_logs")
      .select("id, event_no, event_type, receiver, message_content, callback_status, error_note, callback_time, plate")
      .order("callback_time", { ascending: false })
      .limit(300);

    if (error) {
      setMessage(`讀取失敗：${error.message}。請確認已執行最新 N8N SQL。`);
      setRows([]);
    } else {
      setRows((data || []) as CallbackLog[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const matchStatus = status === "all" || row.callback_status === status;
      const haystack = [
        row.event_no,
        row.event_type || "",
        row.receiver || "",
        row.plate || "",
        row.message_content || "",
        row.error_note || ""
      ]
        .join(" ")
        .toLowerCase();
      return matchStatus && (!q || haystack.includes(q));
    });
  }, [keyword, rows, status]);

  function exportCsv() {
    const header = ["事件編號", "事件類型", "接收人", "訊息內容", "狀態", "時間", "錯誤備註"];
    const body = filtered.map((row) =>
      [
        row.event_no,
        row.event_type || "",
        row.receiver || "",
        row.message_content || "",
        row.callback_status || "",
        row.callback_time || "",
        row.error_note || ""
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([header.join(","), "\n", body.join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `PEIWAY_N8N_CALLBACK_LOGS_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">N8N Callback Records</p>
          <h1 className="text-2xl font-black">N8N 回呼紀錄查詢</h1>
          <p className="mt-1 text-sm text-neutral-500">
            N8N 執行 Telegram、簡訊或其他通知流程後，可把成功或失敗結果回傳到這裡留存。
          </p>
        </div>

        <section className="card grid gap-3 md:grid-cols-[240px_1fr_240px]">
          <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">全部狀態</option>
            <option value="success">成功</option>
            <option value="failed">失敗</option>
            <option value="pending">待處理</option>
            <option value="skipped">略過</option>
          </select>
          <input
            className="form-input"
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
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">回呼紀錄</h2>
            <button type="button" className="secondary-btn" onClick={load} disabled={loading}>
              {loading ? "整理中..." : "重新整理"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-carcare-black text-white">
                <tr>
                  <th className="p-3">事件編號</th>
                  <th className="p-3">接收人</th>
                  <th className="p-3">訊息內容</th>
                  <th className="p-3">狀態</th>
                  <th className="p-3">時間</th>
                  <th className="p-3">錯誤</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-200">
                    <td className="p-3 font-bold">{row.event_no}</td>
                    <td className="p-3">{row.receiver || "-"}</td>
                    <td className="p-3">{row.message_content || "-"}</td>
                    <td className="p-3">{row.callback_status || "-"}</td>
                    <td className="p-3">
                      {row.callback_time ? new Date(row.callback_time).toLocaleString("zh-TW") : "-"}
                    </td>
                    <td className="p-3 text-red-600">{row.error_note || "-"}</td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="p-3" colSpan={6}>
                      目前沒有符合條件的紀錄。
                    </td>
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

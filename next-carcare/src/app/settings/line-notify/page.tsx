"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type LineSetting = {
  id?: string;
  staff_id: string;
  employee_name: string;
  line_notify_token: string;
  notify_todo: boolean;
  notify_abnormal: boolean;
  notify_broadcast: boolean;
  is_active: boolean;
};

const emptySetting: LineSetting = {
  staff_id: "",
  employee_name: "",
  line_notify_token: "",
  notify_todo: true,
  notify_abnormal: true,
  notify_broadcast: true,
  is_active: true
};

export default function LineNotifySettingsPage() {
  const [rows, setRows] = useState<LineSetting[]>([]);
  const [form, setForm] = useState<LineSetting>(emptySetting);
  const [message, setMessage] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("line_notify_settings")
      .select("id, staff_id, employee_name, line_notify_token, notify_todo, notify_abnormal, notify_broadcast, is_active")
      .order("employee_name", { ascending: true });
    if (error) {
      setMessage(`讀取失敗：${error.message}。請先執行 supabase-step15-n8n-line-integration.sql`);
      return;
    }
    setRows((data || []) as LineSetting[]);
  }

  async function save() {
    setMessage("");
    const payload = { ...form, updated_at: new Date().toISOString() };
    const query = form.id
      ? supabase.from("line_notify_settings").update(payload).eq("id", form.id)
      : supabase.from("line_notify_settings").insert(payload);
    const { error } = await query;
    if (error) {
      setMessage(error.message);
      return;
    }
    setForm(emptySetting);
    setMessage("LINE Notify 設定已儲存。");
    load();
  }

  async function remove(id?: string) {
    if (!id || !window.confirm("確定要刪除此員工通知設定？")) return;
    const { error } = await supabase.from("line_notify_settings").delete().eq("id", id);
    if (error) return setMessage(error.message);
    load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">LINE Notify Tokens for N8N</p>
          <h1 className="text-2xl font-black">LINE 通知設定</h1>
          <p className="mt-1 text-sm text-neutral-500">
            主系統只保存員工 Token 與事件開關，實際 LINE Notify API 發送由 N8N 工作流執行。
          </p>
        </div>

        <section className="card grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <input
              className="form-input"
              placeholder="員工編號，可留空"
              value={form.staff_id}
              onChange={(event) => setForm({ ...form, staff_id: event.target.value })}
            />
            <input
              className="form-input"
              placeholder="員工姓名"
              value={form.employee_name}
              onChange={(event) => setForm({ ...form, employee_name: event.target.value })}
            />
            <input
              className="form-input"
              placeholder="LINE Notify Token"
              value={form.line_notify_token}
              onChange={(event) => setForm({ ...form, line_notify_token: event.target.value })}
            />
          </div>
          <div className="space-y-3">
            {[
              ["notify_todo", "待辦事項通知"],
              ["notify_abnormal", "缺失異常通知"],
              ["notify_broadcast", "群組廣播通知"],
              ["is_active", "啟用此員工通知"]
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3 font-black">
                {label}
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-carcare-yellow"
                  checked={Boolean(form[key as keyof LineSetting])}
                  onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
                />
              </label>
            ))}
            <button type="button" className="primary-btn w-full" onClick={save}>
              {form.id ? "更新設定" : "新增設定"}
            </button>
          </div>
        </section>

        {message ? <p className="card font-bold">{message}</p> : null}

        <section className="card">
          <h2 className="mb-4 text-xl font-black">員工通知清單</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>員工</th>
                  <th>待辦</th>
                  <th>異常</th>
                  <th>廣播</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.employee_name}</b>
                      <p className="text-xs text-neutral-500">{row.staff_id || "-"}</p>
                    </td>
                    <td>{row.notify_todo ? "開" : "關"}</td>
                    <td>{row.notify_abnormal ? "開" : "關"}</td>
                    <td>{row.notify_broadcast ? "開" : "關"}</td>
                    <td>{row.is_active ? "啟用" : "停用"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="secondary-btn" onClick={() => setForm(row)}>
                          編輯
                        </button>
                        <button type="button" className="secondary-btn" onClick={() => remove(row.id)}>
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6}>尚未建立通知設定。</td>
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

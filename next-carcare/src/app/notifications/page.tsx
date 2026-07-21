"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { defaultPickupTemplates } from "@/lib/notifications";
import { roleLabels, type Role } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";

type NotifyLog = {
  id: string;
  quotation_id: string | null;
  customer_id: string | null;
  store_id: string | null;
  customer_phone: string;
  send_content: string;
  photo_link: string | null;
  send_time: string;
  send_status: string;
  auto_remind_date: string | null;
};

type NotifyTemplate = {
  id: string;
  shop_id: string | null;
  template_key: string;
  title: string;
  content: string;
  active: boolean;
};

function dateOnly(value?: string | null) {
  return value ? String(value).slice(0, 10) : "";
}

function downloadCsv(rows: NotifyLog[]) {
  const header = ["客戶電話", "通知內容", "照片連結", "發送時間", "狀態", "二次提醒時間"];
  const body = rows.map((row) => [
    row.customer_phone || "",
    row.send_content || "",
    row.photo_link || "",
    row.send_time || "",
    row.send_status || "",
    row.auto_remind_date || ""
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `PEIWAY_通知紀錄_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function NotificationsPage() {
  const [role, setRole] = useState<Role>("worker");
  const [shopId, setShopId] = useState<string | null>(null);
  const [rows, setRows] = useState<NotifyLog[]>([]);
  const [templates, setTemplates] = useState<NotifyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    store: "",
    start: "",
    end: "",
    status: "",
    keyword: ""
  });

  const canManageTemplate = role === "admin" || role === "shop_manager" || role === "vice_manager";
  const canRetry = canManageTemplate;

  async function load() {
    setLoading(true);
    const profile = await getCurrentProfile();
    if (profile) {
      setRole(profile.role);
      setShopId(profile.shop_id);
    }

    const [{ data: logData, error: logError }, { data: templateData }] = await Promise.all([
      supabase
        .from("notify_logs")
        .select("id, quotation_id, customer_id, store_id, customer_phone, send_content, photo_link, send_time, send_status, auto_remind_date")
        .order("send_time", { ascending: false }),
      supabase
        .from("notification_templates")
        .select("id, shop_id, template_key, title, content, active")
        .order("template_key", { ascending: true })
    ]);

    if (logError) {
      alert(`${logError.message}\n\n如果顯示 relation 不存在，請先在 Supabase SQL 執行 supabase-step9-notifications.sql。`);
    }
    setRows((logData || []) as NotifyLog[]);
    setTemplates((templateData || []) as NotifyTemplate[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const term = filters.keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const sendDate = dateOnly(row.send_time);
      const text = `${row.customer_phone} ${row.send_content} ${row.photo_link || ""}`.toLowerCase();
      return (
        (!filters.store || row.store_id === filters.store) &&
        (!filters.start || sendDate >= filters.start) &&
        (!filters.end || sendDate <= filters.end) &&
        (!filters.status || row.send_status === filters.status) &&
        (!term || text.includes(term))
      );
    });
  }, [filters, rows]);

  async function retry(row: NotifyLog) {
    const ok = window.confirm("重新發送會新增一筆 Mock 簡訊紀錄，確定繼續？");
    if (!ok) return;
    const { error } = await supabase.from("notify_logs").insert({
      quotation_id: row.quotation_id,
      customer_id: row.customer_id,
      store_id: row.store_id || shopId,
      customer_phone: row.customer_phone,
      send_content: row.send_content,
      photo_link: row.photo_link,
      send_time: new Date().toISOString(),
      send_status: "成功",
      auto_remind_date: row.auto_remind_date
    });
    if (error) return alert(error.message);
    load();
  }

  async function saveTemplate(template: NotifyTemplate) {
    const { error } = await supabase
      .from("notification_templates")
      .update({ content: template.content })
      .eq("id", template.id);
    if (error) return alert(error.message);
    alert("通知模板已更新，新通知會使用新版文字。");
    load();
  }

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">通知紀錄管理</p>
              <h1 className="text-2xl font-black">完工牽車通知</h1>
              <p className="mt-1 text-sm text-neutral-500">
                目前為 Mock 簡訊紀錄，不串 LINE，也不呼叫外部簡訊 API。登入角色：{roleLabels[role]}
              </p>
            </div>
            <button type="button" className="primary-btn" onClick={() => downloadCsv(filteredRows)}>
              匯出 Excel CSV
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <input className="form-input" placeholder="門市ID" value={filters.store} onChange={(event) => setFilters({ ...filters, store: event.target.value })} />
            <input className="form-input" type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} />
            <input className="form-input" type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} />
            <select className="form-input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">全部狀態</option>
              <option>成功</option>
              <option>失敗</option>
              <option>待重發</option>
            </select>
            <input className="form-input" placeholder="電話、車牌、內容關鍵字" value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} />
          </div>
        </div>

        {canManageTemplate ? (
          <section className="card">
            <h2 className="text-xl font-black">通知模板</h2>
            <p className="mt-1 text-sm text-neutral-500">修改模板只影響之後的新通知，不會改動已發送紀錄。</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(templates.length
                ? templates
                : [
                    { id: "fallback-pickup_first", shop_id: null, template_key: "pickup_first", title: "初次完工通知", content: defaultPickupTemplates.first, active: true },
                    { id: "fallback-pickup_second", shop_id: null, template_key: "pickup_second", title: "逾期二次提醒", content: defaultPickupTemplates.second, active: true }
                  ]).map((template) => (
                <div key={template.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <p className="font-black">{template.title}</p>
                  <textarea
                    className="form-input mt-3 min-h-28"
                    value={template.content}
                    onChange={(event) =>
                      setTemplates((current) =>
                        current.map((item) =>
                          item.id === template.id ? { ...item, content: event.target.value } : item
                        )
                      )
                    }
                  />
                  {template.id.startsWith("fallback-") ? null : (
                    <button type="button" className="primary-btn mt-3" onClick={() => saveTemplate(template)}>
                      儲存模板
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-black">通知紀錄</h2>
            <button type="button" className="secondary-btn" onClick={load}>
              {loading ? "更新中..." : "重新整理"}
            </button>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>客戶電話</th>
                  <th>通知內容</th>
                  <th>照片連結</th>
                  <th>發送時間</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.customer_phone || "-"}</td>
                    <td className="max-w-md whitespace-pre-wrap">{row.send_content}</td>
                    <td>
                      {row.photo_link ? (
                        <a className="font-black text-carcare-yellow underline" href={row.photo_link} target="_blank" rel="noreferrer">
                          開啟照片
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{String(row.send_time || "").slice(0, 16).replace("T", " ")}</td>
                    <td>{row.send_status}</td>
                    <td>
                      <div className="flex min-w-48 flex-wrap gap-2">
                        {row.quotation_id ? (
                          <Link className="secondary-btn" href={`/operations/quotations?quote=${row.quotation_id}`}>
                            對應單據
                          </Link>
                        ) : null}
                        {canRetry && row.send_status === "待重發" ? (
                          <button type="button" className="primary-btn" onClick={() => retry(row)}>
                            重新發送簡訊
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-500">
                      目前尚無通知紀錄。
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

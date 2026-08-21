"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import type { Role } from "@/lib/permissions";

type Row = Record<string, unknown>;
type Payload = { profile?: { role?: Role; name?: string }; [key: string]: Row[] | Row | boolean | undefined };
const list = (data: Payload, key: string) => Array.isArray(data[key]) ? data[key] as Row[] : [];
const text = (row: Row, ...keys: string[]) => keys.map((key) => row[key]).find(Boolean)?.toString() || "-";
const money = (value: number) => `$${Math.round(value).toLocaleString("zh-TW")}`;

function Card({ label, value, alert }: { label: string; value: string | number; alert?: boolean }) {
  return <div className="card"><p className="text-sm font-bold text-neutral-500">{label}</p><p className={`mt-2 text-3xl font-black ${alert ? "text-red-600" : "text-carcare-yellow"}`}>{value}</p></div>;
}

export default function EnterpriseDashboard() {
  const [data, setData] = useState<Payload>({});
  const [message, setMessage] = useState("載入中…");
  useEffect(() => { authenticatedFetch(`/api/admin/erp-control?t=${Date.now()}`, { cache: "no-store" }).then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "讀取失敗");
    setData(result); setMessage("");
  }).catch((error) => setMessage(error instanceof Error ? error.message : "讀取失敗")); }, []);
  const role = data.profile?.role || "worker";
  const orders = list(data, "orders"), appointments = list(data, "appointments"), incidents = list(data, "incidents"), notifications = list(data, "notifications");
  const payments = list(data, "payments"), approvals = list(data, "approvals"), closings = list(data, "closings");
  const revenue = useMemo(() => payments.filter((row) => !row.is_test && !row.is_void).reduce((sum, row) => sum + Number(row.amount || row.paid_amount || 0), 0), [payments]);
  const inProgress = orders.filter((row) => ["in_progress", "施工中"].includes(text(row, "workflow_status", "status"))).length;
  const pendingInspection = orders.filter((row) => ["pending_inspection", "待驗收"].includes(text(row, "workflow_status", "status"))).length;
  const openIncidents = incidents.filter((row) => !row.handled).length;
  const unread = notifications.filter((row) => text(row, "status") === "unread").length;

  return <RequireAuth>
    <section className="space-y-5">
      <header className="card flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-sm font-black text-carcare-yellow">Role Dashboard</p><h1 className="text-2xl font-black">{role === "admin" ? "老闆／總管理員" : role === "finance" ? "財務" : role === "hr" ? "人資" : role === "shop_manager" || role === "vice_manager" ? "門市店長" : "員工個人"}儀表板</h1><p className="text-sm text-neutral-500">依帳號角色只顯示需要處理的數據與待辦。</p></div>{role !== "worker" ? <Link className="primary-btn" href="/enterprise/control">進入營運控制中心</Link> : <Link className="primary-btn" href="/staff/dashboard">回員工個人後台</Link>}</header>
      {message ? <div className="card font-bold">{message}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {role === "admin" || role === "finance" ? <Card label="累計實收" value={money(revenue)}/> : null}
        <Card label={role === "worker" ? "本人／門市工單" : "施工中工單"} value={inProgress}/>
        <Card label="待驗收" value={pendingInspection} alert={pendingInspection > 0}/>
        <Card label="施工缺失" value={openIncidents} alert={openIncidents > 0}/>
        <Card label="未讀通知" value={unread} alert={unread > 0}/>
        {role !== "worker" ? <Card label="今日預約" value={appointments.filter((row) => text(row, "appoint_date") === new Date().toISOString().slice(0, 10)).length}/> : null}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card"><h2 className="text-lg font-black">角色待辦</h2><div className="mt-4 space-y-3">
          {role === "hr" ? <><p>待結算缺失扣款：<strong>{incidents.filter((row) => row.include_in_payroll && !row.payroll_settled_at).length}</strong></p><p>出勤異常請至人資出勤頁確認。</p></> : null}
          {role === "finance" ? <><p>待財務核帳：<strong>{closings.filter((row) => text(row, "status") === "finance_pending").length}</strong></p><p>核帳差異與退款申請請至營運控制中心處理。</p></> : null}
          {role === "shop_manager" || role === "vice_manager" ? <><p>待店長關帳：<strong>{closings.filter((row) => ["manager_pending", "open"].includes(text(row, "status"))).length}</strong></p><p>待驗收施工單：<strong>{pendingInspection}</strong></p></> : null}
          {role === "admin" ? <><p>高風險待審核：<strong>{approvals.filter((row) => text(row, "status") === "pending").length}</strong></p><p>同步或財務異常通知：<strong>{unread}</strong></p></> : null}
          {role === "worker" ? <><p>今日排程：<strong>{appointments.filter((row) => text(row, "appoint_date") === new Date().toISOString().slice(0, 10)).length}</strong></p><p>個人缺失紀錄：<strong>{incidents.length}</strong></p></> : null}
        </div></div>
        <div className="card"><h2 className="text-lg font-black">近期排程</h2><div className="mt-4 space-y-3">{appointments.slice(0, 8).map((row) => <div key={String(row.id)} className="rounded-xl border border-neutral-200 p-3"><strong>{text(row, "appoint_date")} {text(row, "appoint_time")}</strong><p className="text-sm text-neutral-500">{text(row, "service_content")} · {text(row, "status")}</p></div>)}</div></div>
      </div>
    </section>
  </RequireAuth>;
}

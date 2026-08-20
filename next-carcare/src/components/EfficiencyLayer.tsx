"use client";

import { Bell, CheckCircle2, Clock3, Command, RotateCcw, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/permissions";
import { useUiFeedback } from "@/components/UiFeedback";

type SearchHit = { id: string; title: string; detail: string; href: string; kind: string };
type NoticeStatus = "pending" | "completed" | "snoozed" | "needs_reapply";
type LocalNotice = { id: string; title: string; detail: string; href: string; read: boolean; status?: NoticeStatus; remindAt?: string; updatedAt?: string };
const noticeKey = "carcare-ui-notifications-v1";

function readNotices(): LocalNotice[] { try { return JSON.parse(localStorage.getItem(noticeKey) || "[]") as LocalNotice[]; } catch { return []; } }
function resolvedStatus(notice: LocalNotice): NoticeStatus {
  if (notice.status === "snoozed" && notice.remindAt && new Date(notice.remindAt).getTime() <= Date.now()) return "pending";
  if (notice.status) return notice.status;
  if (notice.remindAt && new Date(notice.remindAt).getTime() > Date.now()) return "snoozed";
  return notice.read ? "completed" : "pending";
}
const statusLabels: Record<NoticeStatus, string> = { pending: "待處理", completed: "已完成", snoozed: "稍後提醒", needs_reapply: "有誤，請重新申請" };
const statusPriority: Record<NoticeStatus, number> = { needs_reapply: 0, pending: 1, snoozed: 2, completed: 3 };

export default function EfficiencyLayer({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const { toast } = useUiFeedback();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [panel, setPanel] = useState<"" | "commands" | "notices">("");
  const [notices, setNotices] = useState<LocalNotice[]>([]);
  useEffect(() => {
    async function hydrateNotices() {
      const stored = readNotices();
      const [syncResult, paymentResult, balanceResult] = await Promise.all([
        supabase.from("quotations").select("id,quote_no").eq("sync_status", "failed").limit(20),
        supabase.from("payment").select("id,payment_no,amount").eq("check_status", "pending").limit(20),
        supabase.from("construction_orders").select("id,order_no,total_amount,paid_amount,status").in("status", ["finished", "ready_pickup", "picked_up"]).limit(50),
      ]);
      const unpaidOrders = ((balanceResult.data || []) as { id: string; order_no: string; total_amount: number | null; paid_amount: number | null }[])
        .map((row) => ({ ...row, balance: Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)) }))
        .filter((row) => row.balance > 0);
      const generated: LocalNotice[] = [
        ...((syncResult.data || []) as { id: string; quote_no: string }[]).map((row) => ({ id: `sync-${row.id}`, title: "同步失敗", detail: row.quote_no, href: `/operations/quotations?quote=${row.id}`, read: false })),
        ...((paymentResult.data || []) as { id: string; payment_no: string; amount: number }[]).map((row) => ({ id: `pay-${row.id}`, title: "收款待核銷", detail: `${row.payment_no || "收款"}・$${Number(row.amount || 0).toLocaleString()}`, href: `/finance/payments?payment=${row.id}`, read: false })),
        ...unpaidOrders.map((row) => ({ id: `balance-${row.id}`, title: "尾款未結清", detail: `${row.order_no || "施工單"}・尚欠 $${row.balance.toLocaleString()}`, href: `/finance/payments?order=${row.id}&total=${row.balance}`, read: false })),
      ];
      const state = new Map(stored.map((item) => [item.id, item]));
      const next = generated.map((item) => {
        const merged = { ...item, ...state.get(item.id) };
        const status = resolvedStatus(merged);
        return { ...merged, status, read: status !== "pending" && status !== "needs_reapply", remindAt: status === "snoozed" ? merged.remindAt : undefined };
      });
      setNotices(next); localStorage.setItem(noticeKey, JSON.stringify(next));
    }
    hydrateNotices();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNotices((current) => {
        let changed = false;
        const next = current.map((item) => {
          if (item.status !== "snoozed" || !item.remindAt || new Date(item.remindAt).getTime() > Date.now()) return item;
          changed = true;
          return { ...item, status: "pending" as const, read: false, remindAt: undefined, updatedAt: new Date().toISOString() };
        });
        if (changed) localStorage.setItem(noticeKey, JSON.stringify(next));
        return changed ? next : current;
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("global-fast-search")?.focus(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "/") { event.preventDefault(); setPanel("commands"); }
      if (event.key === "Escape") setPanel("");
    };
    window.addEventListener("keydown", keydown); return () => window.removeEventListener("keydown", keydown);
  }, []);

  const search = useCallback(async (text: string) => {
    const keyword = text.trim(); if (keyword.length < 2) { setHits([]); return; }
    setSearching(true);
    const safe = keyword.replace(/[,%()]/g, " ");
    const [customers, cars, quotes, orders, appointments] = await Promise.all([
      supabase.from("customers").select("id,name,phone").or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(6),
      supabase.from("cars").select("id,customer_name,customer_phone,plate_no").or(`customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,plate_no.ilike.%${safe}%`).limit(6),
      supabase.from("quotations").select("id,quote_no,customer_name,customer_phone,plate_no").or(`quote_no.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,plate_no.ilike.%${safe}%`).limit(6),
      supabase.from("construction_orders").select("id,order_no,status").ilike("order_no", `%${safe}%`).limit(6),
      supabase.from("appointments").select("id,appointment_no,customer_name,license_plate,appoint_date,appoint_time").or(`appointment_no.ilike.%${safe}%,customer_name.ilike.%${safe}%,license_plate.ilike.%${safe}%`).limit(6),
    ]);
    setHits([
      ...((customers.data || []) as Record<string, string | null>[]).map((row) => ({ id: `customer-${row.id}`, kind: "客戶", title: row.name || "未命名客戶", detail: row.phone || "未填電話", href: `/operations/customers?customer=${row.id}` })),
      ...((cars.data || []) as Record<string, string | null>[]).map((row) => ({ id: `car-${row.id}`, kind: "客戶／車輛", title: row.customer_name || row.plate_no || "未命名車輛", detail: [row.customer_phone, row.plate_no].filter(Boolean).join("・"), href: `/operations/customers?car=${row.id}` })),
      ...((quotes.data || []) as Record<string, string | null>[]).map((row) => ({ id: `quote-${row.id}`, kind: "報價單", title: row.quote_no || "報價單", detail: [row.customer_name, row.plate_no].filter(Boolean).join("・"), href: `/operations/quotations?quote=${row.id}` })),
      ...((orders.data || []) as Record<string, string | null>[]).map((row) => ({ id: `order-${row.id}`, kind: "施工單", title: row.order_no || "施工單", detail: row.status || "", href: `/operations/orders?order=${row.id}` })),
      ...((appointments.data || []) as Record<string, string | null>[]).map((row) => ({ id: `appointment-${row.id}`, kind: "預約", title: row.appointment_no || row.customer_name || "預約", detail: [row.license_plate, row.appoint_date, row.appoint_time].filter(Boolean).join("・"), href: `/operations/calendar?appointment=${row.id}` })),
    ]);
    setSearching(false);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => search(query), 250); return () => window.clearTimeout(timer); }, [query, search]);

  const commands = useMemo(() => [
    { label: "新增預約", href: "/operations/calendar?action=new" }, { label: "快速開單", href: "/operations/mobile-order" },
    { label: "登記收款", href: "/finance/payments?action=new" }, { label: "查詢車牌", action: () => document.getElementById("global-fast-search")?.focus() },
    ...(profile.role === "worker" ? [{ label: "施工現場模式", href: "/operations/field-mode" }] : []),
  ], [profile.role]);
  function saveNotices(next: LocalNotice[]) { setNotices(next); localStorage.setItem(noticeKey, JSON.stringify(next)); }
  function setNoticeStatus(id: string, status: NoticeStatus) {
    const now = new Date();
    const remindAt = status === "snoozed" ? new Date(now.getTime() + 3600000).toISOString() : undefined;
    saveNotices(notices.map((item) => item.id === id ? {
      ...item,
      status,
      remindAt,
      read: status !== "pending" && status !== "needs_reapply",
      updatedAt: now.toISOString(),
    } : item));
    if (status === "completed") toast("通知已標記為完成。", "success");
    if (status === "snoozed") toast("已設定 1 小時後再次提醒。", "warning");
    if (status === "needs_reapply") toast("已標記有誤，請前往原單據重新申請。", "error", { label: "前往處理", onClick: () => go(notices.find((item) => item.id === id)?.href || "/dashboard") });
  }
  function go(href: string) { setQuery(""); setHits([]); setPanel(""); router.push(href); }

  const sortedNotices = useMemo(() => [...notices].sort((a, b) => statusPriority[resolvedStatus(a)] - statusPriority[resolvedStatus(b)]), [notices]);
  const noticeCounts = useMemo(() => notices.reduce<Record<NoticeStatus, number>>((counts, notice) => {
    counts[resolvedStatus(notice)] += 1;
    return counts;
  }, { pending: 0, completed: 0, snoozed: 0, needs_reapply: 0 }), [notices]);
  const actionableCount = noticeCounts.pending + noticeCounts.needs_reapply;

  return <>
    <div className="global-efficiency-bar">
      <div className="global-search"><Search size={18} aria-hidden="true" /><input id="global-fast-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋姓名、電話、車牌、報價單號、施工單號" aria-label="全域快速搜尋" /><kbd>Ctrl K</kbd>
        {query ? <div className="global-search-results">{searching ? <p>搜尋中…</p> : hits.map((hit) => <button key={hit.id} type="button" onClick={() => go(hit.href)}><span>{hit.kind}</span><strong>{hit.title}</strong><small>{hit.detail}</small></button>)}{!searching && !hits.length ? <p>找不到符合資料</p> : null}</div> : null}
      </div>
      <button type="button" className="icon-action" aria-label="快捷指令" onClick={() => setPanel("commands")}><Command /></button>
      <button type="button" className="icon-action" aria-label={`通知中心${actionableCount ? `，${actionableCount} 筆待處理` : ""}`} onClick={() => setPanel("notices")}><Bell />{actionableCount ? <i>{actionableCount > 9 ? "9+" : actionableCount}</i> : null}</button>
    </div>
    <button type="button" className="mobile-command-fab" aria-label="開啟快捷指令" onClick={() => setPanel("commands")}><Command /></button>
    {panel ? <div className="command-backdrop" onMouseDown={() => setPanel("")}><section className="command-panel" role="dialog" aria-modal="true" aria-label={panel === "commands" ? "快捷指令" : "通知中心"} onMouseDown={(event) => event.stopPropagation()}><header><h2>{panel === "commands" ? "快捷指令" : "通知中心"}</h2><button type="button" className="icon-action" onClick={() => setPanel("")}><X /></button></header>
      {panel === "commands" ? <div className="command-grid">{commands.map((item) => <button key={item.label} type="button" onClick={() => item.href ? go(item.href) : item.action?.()}>{item.label}</button>)}</div> : <div className="notice-list">
        <div className="notice-summary" aria-label="通知狀態統計">
          <span><strong>{noticeCounts.pending}</strong>待處理</span><span><strong>{noticeCounts.snoozed}</strong>稍後提醒</span><span><strong>{noticeCounts.needs_reapply}</strong>需重辦</span><span><strong>{noticeCounts.completed}</strong>已完成</span>
        </div>
        {sortedNotices.map((notice) => {
          const status = resolvedStatus(notice);
          return <article key={notice.id} className={`notice-${status}`}>
            <button className="notice-main" type="button" onClick={() => go(notice.href)}>
              <span className={`notice-status notice-status-${status}`}>{statusLabels[status]}{status === "snoozed" && notice.remindAt ? ` · ${new Date(notice.remindAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
              <strong>{notice.title}</strong><span>{notice.detail}</span><small>點擊查看原單據</small>
            </button>
            <div className="notice-actions">
              <button type="button" className="notice-complete" disabled={status === "completed"} onClick={() => setNoticeStatus(notice.id, "completed")}><CheckCircle2 size={16} />已完成</button>
              <button type="button" className="notice-snooze" disabled={status === "snoozed"} onClick={() => setNoticeStatus(notice.id, "snoozed")}><Clock3 size={16} />稍後提醒</button>
              <button type="button" className="notice-reapply" disabled={status === "needs_reapply"} onClick={() => setNoticeStatus(notice.id, "needs_reapply")}><RotateCcw size={16} />有誤，請重新申請</button>
            </div>
          </article>;
        })}
        {!notices.length ? <p className="empty-state">目前沒有前端提醒。</p> : null}
      </div>}
    </section></div> : null}
  </>;
}

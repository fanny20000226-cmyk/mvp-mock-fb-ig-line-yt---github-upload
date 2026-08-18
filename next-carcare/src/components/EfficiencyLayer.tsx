"use client";

import { Bell, Command, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/lib/permissions";

type SearchHit = { id: string; title: string; detail: string; href: string; kind: string };
type LocalNotice = { id: string; title: string; detail: string; href: string; read: boolean; remindAt?: string };
const noticeKey = "carcare-ui-notifications-v1";

function readNotices(): LocalNotice[] { try { return JSON.parse(localStorage.getItem(noticeKey) || "[]") as LocalNotice[]; } catch { return []; } }

export default function EfficiencyLayer({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [panel, setPanel] = useState<"" | "commands" | "notices">("");
  const [notices, setNotices] = useState<LocalNotice[]>([]);
  useEffect(() => {
    async function hydrateNotices() {
      const stored = readNotices();
      const [syncResult, paymentResult] = await Promise.all([
        supabase.from("quotations").select("id,quote_no").eq("sync_status", "failed").limit(20),
        supabase.from("payment").select("id,payment_no,amount").eq("check_status", "pending").limit(20),
      ]);
      const generated: LocalNotice[] = [
        ...((syncResult.data || []) as { id: string; quote_no: string }[]).map((row) => ({ id: `sync-${row.id}`, title: "同步失敗", detail: row.quote_no, href: `/operations/quotations?quote=${row.id}`, read: false })),
        ...((paymentResult.data || []) as { id: string; payment_no: string; amount: number }[]).map((row) => ({ id: `pay-${row.id}`, title: "收款待核銷", detail: `${row.payment_no || "收款"}・$${Number(row.amount || 0).toLocaleString()}`, href: `/finance/payments?payment=${row.id}`, read: false })),
      ];
      const state = new Map(stored.map((item) => [item.id, item]));
      const next = generated.map((item) => ({ ...item, ...state.get(item.id) })); setNotices(next); localStorage.setItem(noticeKey, JSON.stringify(next));
    }
    hydrateNotices();
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
    const [cars, quotes, orders] = await Promise.all([
      supabase.from("cars").select("id,customer_name,customer_phone,plate_no").or(`customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,plate_no.ilike.%${safe}%`).limit(6),
      supabase.from("quotations").select("id,quote_no,customer_name,customer_phone,plate_no").or(`quote_no.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%,plate_no.ilike.%${safe}%`).limit(6),
      supabase.from("construction_orders").select("id,order_no,status").ilike("order_no", `%${safe}%`).limit(6),
    ]);
    setHits([
      ...((cars.data || []) as Record<string, string | null>[]).map((row) => ({ id: `car-${row.id}`, kind: "客戶／車輛", title: row.customer_name || row.plate_no || "未命名車輛", detail: [row.phone, row.customer_phone, row.plate_no].filter(Boolean).join("・"), href: `/operations/customers?car=${row.id}` })),
      ...((quotes.data || []) as Record<string, string | null>[]).map((row) => ({ id: `quote-${row.id}`, kind: "報價單", title: row.quote_no || "報價單", detail: [row.customer_name, row.plate_no].filter(Boolean).join("・"), href: `/operations/quotations?quote=${row.id}` })),
      ...((orders.data || []) as Record<string, string | null>[]).map((row) => ({ id: `order-${row.id}`, kind: "施工單", title: row.order_no || "施工單", detail: row.status || "", href: `/operations/orders?order=${row.id}` })),
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
  function go(href: string) { setQuery(""); setHits([]); setPanel(""); router.push(href); }

  return <>
    <div className="global-efficiency-bar">
      <div className="global-search"><Search size={18} aria-hidden="true" /><input id="global-fast-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋姓名、電話、車牌、報價單號、施工單號" aria-label="全域快速搜尋" /><kbd>Ctrl K</kbd>
        {query ? <div className="global-search-results">{searching ? <p>搜尋中…</p> : hits.map((hit) => <button key={hit.id} type="button" onClick={() => go(hit.href)}><span>{hit.kind}</span><strong>{hit.title}</strong><small>{hit.detail}</small></button>)}{!searching && !hits.length ? <p>找不到符合資料</p> : null}</div> : null}
      </div>
      <button type="button" className="icon-action" aria-label="快捷指令" onClick={() => setPanel("commands")}><Command /></button>
      <button type="button" className="icon-action" aria-label="通知中心" onClick={() => setPanel("notices")}><Bell />{notices.some((item) => !item.read) ? <i /> : null}</button>
    </div>
    <button type="button" className="mobile-command-fab" aria-label="開啟快捷指令" onClick={() => setPanel("commands")}><Command /></button>
    {panel ? <div className="command-backdrop" onMouseDown={() => setPanel("")}><section className="command-panel" role="dialog" aria-modal="true" aria-label={panel === "commands" ? "快捷指令" : "通知中心"} onMouseDown={(event) => event.stopPropagation()}><header><h2>{panel === "commands" ? "快捷指令" : "通知中心"}</h2><button type="button" className="icon-action" onClick={() => setPanel("")}><X /></button></header>
      {panel === "commands" ? <div className="command-grid">{commands.map((item) => <button key={item.label} type="button" onClick={() => item.href ? go(item.href) : item.action?.()}>{item.label}</button>)}</div> : <div className="notice-list">{notices.map((notice) => <article key={notice.id} className={notice.read ? "is-read" : ""}><button type="button" onClick={() => { saveNotices(notices.map((item) => item.id === notice.id ? { ...item, read: true } : item)); go(notice.href); }}><strong>{notice.title}</strong><span>{notice.detail}</span></button><button type="button" onClick={() => saveNotices(notices.map((item) => item.id === notice.id ? { ...item, remindAt: new Date(Date.now() + 3600000).toISOString(), read: true } : item))}>稍後提醒</button></article>)}{!notices.length ? <p className="empty-state">目前沒有前端提醒。</p> : null}</div>}
    </section></div> : null}
  </>;
}

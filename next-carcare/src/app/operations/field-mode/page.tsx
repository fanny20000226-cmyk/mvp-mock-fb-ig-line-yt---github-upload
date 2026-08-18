"use client";

import { Camera, CheckCircle2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { useUiFeedback } from "@/components/UiFeedback";
import { supabase } from "@/lib/supabase";

type FieldOrder = { id: string; order_no: string; status: string; remark: string | null; start_at: string | null; cars?: { plate_no?: string | null; customer_name?: string | null } | null };
const checks = ["施工項目已逐項完成", "車內外已復查", "施工照片已補齊", "客戶物品已確認", "完工備註已填寫"];

export default function FieldModePage() {
  const { toast } = useUiFeedback();
  const [rows, setRows] = useState<FieldOrder[]>([]);
  const [active, setActive] = useState<FieldOrder | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [running, setRunning] = useState("");
  async function load() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase.from("construction_orders").select("id,order_no,status,remark,start_at,cars(plate_no,customer_name)").neq("status", "cancelled").order("created_at", { ascending: false }).limit(60);
    if (error) return toast(error.message, "error");
    setRows(((data || []) as FieldOrder[]).filter((row) => !row.start_at || String(row.start_at).slice(0, 10) === today));
  }
  useEffect(() => { load(); }, []);
  async function setStatus(row: FieldOrder, status: string) {
    if (running) return; setRunning(row.id);
    const patch: Record<string, string> = { status }; if (status === "working" && !row.start_at) patch.start_at = new Date().toISOString(); if (status === "finished") patch.finish_at = new Date().toISOString();
    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id); setRunning("");
    if (error) return toast(error.message, "error"); toast(status === "finished" ? "完工狀態已更新。" : "已開始施工。", "success"); setActive(null); setChecked([]); load();
  }
  function requestFinish(row: FieldOrder) { setActive(row); setChecked([]); }
  return <RequireAuth allow={["admin", "shop_manager", "vice_manager", "worker"]}><main className="field-mode space-y-4">
    <header className="rounded-xl bg-neutral-950 p-5 text-white"><p className="text-sm font-black text-carcare-yellow">TECHNICIAN MODE</p><h1 className="text-2xl text-white">施工現場模式</h1><p className="mt-1 text-base text-neutral-300">只顯示今日工單、備註、照片與必要狀態操作。</p></header>
    <div className="grid gap-4 lg:grid-cols-2">{rows.map((row) => <article key={row.id} className="rounded-xl border border-neutral-300 bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-neutral-500">{row.order_no}</p><h2 className="text-2xl">{row.cars?.plate_no || "未填車牌"}</h2><p className="text-base font-bold text-neutral-700">{row.cars?.customer_name || "未命名客戶"}</p></div><span className="status-chip status-info">● {row.status === "working" ? "施工中" : row.status === "finished" ? "已完工" : "待施工"}</span></div><div className="my-4 rounded-xl bg-neutral-100 p-4"><strong>工單備註</strong><p className="mt-1 whitespace-pre-wrap text-base text-neutral-700">{row.remark || "無備註"}</p></div><div className="grid grid-cols-2 gap-3"><label className="field-camera-button"><Camera />拍攝施工照片<input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => toast("照片已選取，請回工單照片區完成歸檔。", "info")} /></label>{row.status === "working" ? <button type="button" className="primary-btn field-big-button" onClick={() => requestFinish(row)}><CheckCircle2 />完成施工</button> : row.status === "finished" ? <button type="button" className="secondary-btn field-big-button" disabled>已完成</button> : <button type="button" className="primary-btn field-big-button" disabled={Boolean(running)} onClick={() => setStatus(row, "working")}><Play />開始施工</button>}</div></article>)}</div>
    {!rows.length ? <p className="empty-state">今天沒有待施工工單。</p> : null}
    {active ? <div className="dialog-backdrop"><section className="dialog-panel max-w-lg"><p className="eyebrow">完工前检查</p><h2>{active.order_no}</h2><div className="mt-4 space-y-2">{checks.map((item) => <label key={item} className="flex min-h-12 items-center gap-3 rounded-lg border border-neutral-200 p-3 text-base font-bold"><input type="checkbox" checked={checked.includes(item)} onChange={() => setChecked((current) => current.includes(item) ? current.filter((row) => row !== item) : [...current, item])} />{item}</label>)}</div><div className="dialog-actions"><button type="button" className="secondary-btn" onClick={() => setActive(null)}>返回检查</button><button type="button" className="primary-btn" disabled={checked.length !== checks.length || Boolean(running)} onClick={() => setStatus(active, "finished")}>确认完工</button></div></section></div> : null}
  </main></RequireAuth>;
}

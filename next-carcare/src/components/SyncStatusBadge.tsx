"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { errorMessageZh } from "@/lib/errorMessageZh";
import { useUiFeedback } from "@/components/UiFeedback";

export type SyncState = "synced" | "pending" | "failed";

const style = {
  synced: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-carcare-yellow/25 text-neutral-900 border-carcare-yellow",
  failed: "bg-red-100 text-red-700 border-red-200"
};
const label = { synced: "已同步", pending: "待同步", failed: "同步失敗" };

export default function SyncStatusBadge({ table, row, syncType, isAdmin, onChanged }: {
  table: string;
  row: Record<string, unknown> & { id: string; sync_status?: SyncState | null; last_sync_at?: string | null; sync_error?: string | null };
  syncType: "customer" | "finance" | "salary" | "appointment";
  isAdmin?: boolean;
  onChanged?: () => void;
}) {
  const { toast } = useUiFeedback();
  const [running, setRunning] = useState(false);
  const status = row.sync_status || "pending";
  async function retry() {
    if (running) return;
    setRunning(true);
    try {
      const endpoint = syncType === "salary" ? "/api/hr/salary-sync" : syncType === "appointment" ? "/api/appointments/sync" : "/api/n8n/realtime-sync";
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sync_type: syncType, source_table: table, unique_key: row.id, record: row, operation: "upsert" }) });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      const next = response.ok ? "synced" : "failed";
      await supabase.from(table).update({ sync_status: next, last_sync_at: response.ok ? new Date().toISOString() : row.last_sync_at || null, sync_error: response.ok ? null : result.message || "N8N 同步失敗" }).eq("id", row.id);
      if (!response.ok) toast(errorMessageZh(result.message, "重新同步失敗。"), "error");
      else toast("重新同步已送出。", "success");
      onChanged?.();
    } catch (error) {
      toast(errorMessageZh(error, "重新同步失敗。"), "error");
    } finally { setRunning(false); }
  }
  return <div className="flex min-w-32 flex-col items-start gap-1" title={status === "failed" ? row.sync_error || "同步失敗" : undefined}>
    <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${style[status]}`}>{label[status]}</span>
    <span className="text-[11px] text-neutral-500">{row.last_sync_at ? new Date(row.last_sync_at).toLocaleString("zh-TW") : "尚無同步時間"}</span>
    {isAdmin && status === "failed" ? <button type="button" className="min-h-0 text-xs font-black text-red-700 underline disabled:opacity-50" disabled={running} onClick={retry}>{running ? "同步中…" : "重新同步"}</button> : null}
  </div>;
}

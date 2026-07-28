import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getN8nSettings } from "@/lib/n8nIntegration";

async function safeSelect(table: string, columns: string, orderColumn: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from(table)
    .select(columns)
    .order(orderColumn, { ascending: false })
    .limit(8);

  if (error) {
    return { ok: false, rows: [], message: error.message };
  }

  return { ok: true, rows: data || [], message: "" };
}

export async function GET() {
  try {
    const settings = await getN8nSettings();
    const dispatchLogs = await safeSelect(
      "n8n_event_dispatch_logs",
      "id, event_no, event_type, dispatch_status, response_status, error_message, dispatched_at",
      "dispatched_at"
    );
    const callbackLogs = await safeSelect(
      "n8n_callback_logs",
      "id, event_no, event_type, receiver, callback_status, error_note, callback_time",
      "callback_time"
    );

    return NextResponse.json({
      settings: settings || { webhook_url: "", callback_webhook_url: "", is_enabled: false },
      dispatchLogs,
      callbackLogs
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load N8N diagnostics";
    return NextResponse.json({ message }, { status: 500 });
  }
}

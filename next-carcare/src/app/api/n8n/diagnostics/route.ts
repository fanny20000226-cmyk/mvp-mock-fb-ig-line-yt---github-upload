import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getN8nSettings } from "@/lib/n8nIntegration";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

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

export async function GET(request: Request) {
  try {
    await requireServerProfile(request, ["admin"]);
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
    const parsed = apiError(error);
    return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  }
}

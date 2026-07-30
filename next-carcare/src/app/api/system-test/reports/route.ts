import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("system_test_runs")
      .select(
        "id, run_no, mode, status, n8n_status, n8n_event_no, summary, report, cleanup_report, error_message, started_at, finished_at"
      )
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ rows: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取測試報告失敗";
    return NextResponse.json({ message }, { status: 500 });
  }
}

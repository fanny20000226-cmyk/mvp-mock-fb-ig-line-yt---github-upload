import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate",
};

type DispatchLogRow = {
  id: string;
  event_no: string;
  dispatch_status: string;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  error_message: string | null;
  dispatched_at: string;
};

function fallbackRun(row: DispatchLogRow) {
  const success = row.dispatch_status === "success";
  return {
    id: row.id,
    run_no: row.event_no,
    mode: "manual",
    status: success ? "success" : "failed",
    n8n_status: row.dispatch_status,
    n8n_event_no: row.event_no,
    summary: {
      total_steps: 1,
      success_steps: success ? 1 : 0,
      failed_steps: success ? 0 : 1,
      cleaned_rows: 0,
      fallback_source: "n8n_event_dispatch_logs",
      response_status: row.response_status,
    },
    report: [
      {
        key: "n8n-dispatch-log",
        title: "N8N 單次同步紀錄",
        status: success ? "success" : "failed",
        message: success ? "N8N 已接收系統測試事件" : row.error_message || "N8N 同步失敗",
        actual: row.response_body || {},
      },
    ],
    cleanup_report: [],
    error_message: row.error_message || null,
    started_at: row.dispatched_at,
    finished_at: row.dispatched_at,
  };
}

function errorMessage(error: unknown) {
  if (!error) return "讀取測試報告失敗";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

async function readFallbackReports(admin: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await admin
    .from("n8n_event_dispatch_logs")
    .select("id, event_no, dispatch_status, response_status, response_body, error_message, dispatched_at")
    .eq("event_type", "system_test")
    .order("dispatched_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []).map((row) => fallbackRun(row as DispatchLogRow));
}

export async function GET(request: Request) {
  try {
    await requireServerProfile(request, ["admin", "shop_manager"]);
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json(
      { rows: [], message: parsed.message },
      { status: parsed.status, headers: noStoreHeaders }
    );
  }
  const admin = getSupabaseAdmin();

  try {
    const { data, error } = await admin
      .from("system_test_runs")
      .select(
        "id, run_no, mode, status, n8n_status, n8n_event_no, summary, report, cleanup_report, error_message, started_at, finished_at"
      )
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return NextResponse.json({ rows: data || [] }, { headers: noStoreHeaders });
  } catch (error) {
    const message = errorMessage(error);
    if (message.includes("system_test_runs")) {
      try {
        const rows = await readFallbackReports(admin);
        return NextResponse.json(
          {
            rows,
            warning: "system_test_runs 尚未建立，暫時改讀 N8N 發送紀錄。",
          },
          { headers: noStoreHeaders }
        );
      } catch (fallbackError) {
        return NextResponse.json(
          {
            rows: [],
            warning: errorMessage(fallbackError),
          },
          { headers: noStoreHeaders }
        );
      }
    }

    return NextResponse.json({ rows: [], warning: message }, { headers: noStoreHeaders });
  }
}

import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, updateSourceSyncStatus } from "@/lib/n8nIntegration";
import { apiError, requireScopedShopId, requireServerProfile } from "@/lib/serverAuth";

const DEFAULT_SALARY_SHEET_ID = "1b8bM9hQxrFR-wbCc9PQMHJFBpvK4amqIp0AYp5rI-O0";

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, ["admin", "hr"]);
    const body = (await request.json()) as {
      record?: Record<string, unknown>;
      unique_key?: string;
      shop_id?: string | null;
      shop_name?: string | null;
    };

    if (!body.record || !body.unique_key) {
      return NextResponse.json({ ok: false, message: "Missing salary sync record." }, { status: 400 });
    }

    const shopId = await requireScopedShopId(profile, body.shop_id);
    const result = await sendSheetSyncToN8n({
      sync_type: "salary",
      source_table: "salary_records",
      operation: "insert",
      unique_key: body.unique_key,
      record: body.record,
      target_sheet_id: process.env.GOOGLE_SALARY_SHEET_ID || DEFAULT_SALARY_SHEET_ID,
      store_id: shopId,
      store_name: body.shop_name || null
    });
    await updateSourceSyncStatus({
      source_table: "salary_records",
      unique_key: body.unique_key,
      ok: Boolean(result.ok),
      error: result.ok ? null : "N8N 薪資同步失敗",
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

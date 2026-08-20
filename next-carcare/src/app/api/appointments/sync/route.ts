import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, updateSourceSyncStatus } from "@/lib/n8nIntegration";
import { apiError, requireScopedShopId, requireServerProfile } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request);
    const body = await request.json();
    const record = body.record && typeof body.record === "object" ? body.record : null;
    const recordId = (record as Record<string, unknown> | null)?.id;
    const uniqueKey = String(body.unique_key || recordId || "").trim();

    if (!record || !uniqueKey) {
      return NextResponse.json(
        { ok: false, message: "Missing appointment sync record." },
        { status: 400 }
      );
    }

    const shopId = await requireScopedShopId(profile, body.store_id);
    const result = await sendSheetSyncToN8n({
      sync_type: "appointment",
      source_table: "appointments",
      operation:
        body.operation === "insert" || body.operation === "update" || body.operation === "test"
          ? body.operation
          : "upsert",
      unique_key: uniqueKey,
      record: record as Record<string, unknown>,
      store_id: shopId,
      store_name: typeof body.store_name === "string" ? body.store_name : null,
      plate: typeof body.plate === "string" ? body.plate : null,
      model: typeof body.model === "string" ? body.model : null
    });
    await updateSourceSyncStatus({
      source_table: "appointments",
      unique_key: String(recordId || uniqueKey),
      ok: Boolean(result.ok),
      error: result.ok ? null : "N8N 預約同步失敗",
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

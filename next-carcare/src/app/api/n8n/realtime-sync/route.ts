import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, type SheetSyncKind, updateSourceSyncStatus } from "@/lib/n8nIntegration";
import { apiError, requireScopedShopId, requireServerProfile } from "@/lib/serverAuth";

function normalizeKind(value: unknown): SheetSyncKind | null {
  return value === "customer" || value === "finance" || value === "appointment" || value === "staff_mistake" ? value : null;
}

function sourceTable(syncType: SheetSyncKind) {
  if (syncType === "customer") return "customers";
  if (syncType === "appointment") return "appointments";
  if (syncType === "staff_mistake") return "staff_mistake_record";
  return "payment";
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request);
    const body = await request.json();
    const syncType = normalizeKind(body.sync_type);
    const record = body.record && typeof body.record === "object" ? body.record : null;
    const recordId = (record as Record<string, unknown> | null)?.id;
    const uniqueKey = String(body.unique_key || recordId || "").trim();

    if (!syncType || !record || !uniqueKey) {
      return NextResponse.json(
        { ok: false, message: "Missing sync_type, unique_key, or record." },
        { status: 400 }
      );
    }

    const shopId = await requireScopedShopId(profile, body.store_id);
    const result = await sendSheetSyncToN8n({
      sync_type: syncType,
      source_table: String(body.source_table || sourceTable(syncType)),
      operation: body.operation === "update" || body.operation === "insert" || body.operation === "test" ? body.operation : "upsert",
      unique_key: uniqueKey,
      record: record as Record<string, unknown>,
      store_id: shopId,
      store_name: typeof body.store_name === "string" ? body.store_name : null,
      plate: typeof body.plate === "string" ? body.plate : null,
      model: typeof body.model === "string" ? body.model : null
    });
    await updateSourceSyncStatus({
      source_table: String(body.source_table || sourceTable(syncType)),
      unique_key: uniqueKey,
      ok: Boolean(result.ok),
      error: result.ok ? null : "N8N 即時同步失敗",
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, type SheetSyncKind } from "@/lib/n8nIntegration";

function normalizeKind(value: unknown): SheetSyncKind | null {
  return value === "customer" || value === "finance" ? value : null;
}

export async function POST(request: Request) {
  try {
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

    const result = await sendSheetSyncToN8n({
      sync_type: syncType,
      source_table: String(body.source_table || (syncType === "customer" ? "customers" : "payment")),
      operation: body.operation === "update" || body.operation === "insert" || body.operation === "test" ? body.operation : "upsert",
      unique_key: uniqueKey,
      record: record as Record<string, unknown>,
      store_id: typeof body.store_id === "string" ? body.store_id : null,
      store_name: typeof body.store_name === "string" ? body.store_name : null,
      plate: typeof body.plate === "string" ? body.plate : null,
      model: typeof body.model === "string" ? body.model : null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Realtime N8N sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

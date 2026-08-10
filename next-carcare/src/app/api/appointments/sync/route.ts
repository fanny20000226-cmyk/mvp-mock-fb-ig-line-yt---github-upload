import { NextResponse } from "next/server";
import { sendSheetSyncToN8n } from "@/lib/n8nIntegration";

export async function POST(request: Request) {
  try {
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

    const result = await sendSheetSyncToN8n({
      sync_type: "appointment",
      source_table: "appointments",
      operation:
        body.operation === "insert" || body.operation === "update" || body.operation === "test"
          ? body.operation
          : "upsert",
      unique_key: uniqueKey,
      record: record as Record<string, unknown>,
      store_id: typeof body.store_id === "string" ? body.store_id : null,
      store_name: typeof body.store_name === "string" ? body.store_name : null,
      plate: typeof body.plate === "string" ? body.plate : null,
      model: typeof body.model === "string" ? body.model : null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Appointment N8N sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

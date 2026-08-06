import { NextResponse } from "next/server";
import { sendSheetSyncToN8n } from "@/lib/n8nIntegration";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      record?: Record<string, unknown>;
      unique_key?: string;
      shop_id?: string | null;
      shop_name?: string | null;
    };

    if (!body.record || !body.unique_key) {
      return NextResponse.json({ ok: false, message: "Missing salary sync record." }, { status: 400 });
    }

    const result = await sendSheetSyncToN8n({
      sync_type: "salary",
      source_table: "salary_records",
      operation: "insert",
      unique_key: body.unique_key,
      record: body.record,
      store_id: body.shop_id || null,
      store_name: body.shop_name || null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Salary N8N sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

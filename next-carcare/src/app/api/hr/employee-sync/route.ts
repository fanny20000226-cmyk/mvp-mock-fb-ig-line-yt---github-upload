import { NextResponse } from "next/server";
import { sendEmployeeSheetSync } from "@/lib/n8nIntegration";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      record?: Record<string, unknown>;
      unique_key?: string;
      shop_id?: string | null;
      shop_name?: string | null;
      operation?: "insert" | "update" | "upsert" | "test";
    };

    if (!body.record || !body.unique_key) {
      return NextResponse.json({ ok: false, message: "Missing employee sync record." }, { status: 400 });
    }

    const result = await sendEmployeeSheetSync({
      operation: body.operation || "upsert",
      unique_key: body.unique_key,
      record: body.record,
      shop_id: body.shop_id || null,
      shop_name: body.shop_name || null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Employee N8N sync failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

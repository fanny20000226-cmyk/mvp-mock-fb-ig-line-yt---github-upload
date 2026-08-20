import { NextResponse } from "next/server";
import { sendEmployeeSheetSync } from "@/lib/n8nIntegration";
import { apiError, requireScopedShopId, requireServerProfile } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, ["admin", "hr"]);
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

    const shopId = await requireScopedShopId(profile, body.shop_id);
    const result = await sendEmployeeSheetSync({
      operation: body.operation || "upsert",
      unique_key: body.unique_key,
      record: body.record,
      shop_id: shopId,
      shop_name: body.shop_name || null
    });

    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

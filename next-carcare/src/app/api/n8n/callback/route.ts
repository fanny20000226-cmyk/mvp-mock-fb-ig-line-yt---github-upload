import { NextResponse } from "next/server";
import { recordN8nCallback } from "@/lib/n8nIntegration";
import { apiError, requireN8nWebhookSecret } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    requireN8nWebhookSecret(request, body);
    if (!body.event_no) {
      return NextResponse.json({ message: "event_no is required" }, { status: 400 });
    }

    const data = await recordN8nCallback({
      ...body,
      raw_payload: body
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

import { NextResponse } from "next/server";
import { recordN8nCallback } from "@/lib/n8nIntegration";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.event_no) {
      return NextResponse.json({ message: "event_no is required" }, { status: 400 });
    }

    const data = await recordN8nCallback({
      ...body,
      raw_payload: body
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save N8N callback";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { sendEventToN8n, type N8nEventType } from "@/lib/n8nIntegration";

const allowedTypes: N8nEventType[] = [
  "todo",
  "abnormal",
  "broadcast",
  "connection_test",
  "system_test",
  "sheet_sync",
  "sheet_sync_test"
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!allowedTypes.includes(body.event_type)) {
      return NextResponse.json({ message: "Unsupported event_type" }, { status: 400 });
    }

    const result = await sendEventToN8n(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to dispatch N8N event";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

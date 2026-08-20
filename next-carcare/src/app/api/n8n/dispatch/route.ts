import { NextResponse } from "next/server";
import { sendEventToN8n, type N8nEventType } from "@/lib/n8nIntegration";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

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
    await requireServerProfile(request, ["admin"]);
    const body = await request.json();
    if (!allowedTypes.includes(body.event_type)) {
      return NextResponse.json({ message: "Unsupported event_type" }, { status: 400 });
    }

    const result = await sendEventToN8n(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

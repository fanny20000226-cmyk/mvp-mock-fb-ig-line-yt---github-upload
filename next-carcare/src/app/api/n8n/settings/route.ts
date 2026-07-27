import { NextResponse } from "next/server";
import { getN8nSettings, upsertN8nSettings } from "@/lib/n8nIntegration";

export async function GET() {
  try {
    const settings = await getN8nSettings();
    return NextResponse.json(
      settings || { webhook_url: "", callback_webhook_url: "", is_enabled: false }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load N8N settings";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      webhook_url?: string;
      callback_webhook_url?: string;
      is_enabled?: boolean;
    };
    const data = await upsertN8nSettings({
      webhook_url: body.webhook_url || "",
      callback_webhook_url: body.callback_webhook_url || "",
      is_enabled: Boolean(body.is_enabled)
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save N8N settings";
    return NextResponse.json({ message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getN8nSettings, upsertN8nSettings } from "@/lib/n8nIntegration";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

export async function GET(request: Request) {
  try {
    await requireServerProfile(request, ["admin"]);
    const settings = await getN8nSettings();
    return NextResponse.json(
      settings || { webhook_url: "", callback_webhook_url: "", is_enabled: false }
    );
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  }
}

export async function POST(request: Request) {
  try {
    await requireServerProfile(request, ["admin"]);
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
    const parsed = apiError(error);
    return NextResponse.json({ message: parsed.message }, { status: parsed.status });
  }
}

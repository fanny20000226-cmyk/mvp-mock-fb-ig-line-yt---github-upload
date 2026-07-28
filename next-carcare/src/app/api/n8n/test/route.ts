import { NextResponse } from "next/server";
import { testN8nConnection } from "@/lib/n8nIntegration";

export async function POST(request: Request) {
  try {
    let body: { receiver?: string; message?: string } = {};
    try {
      body = (await request.json()) as { receiver?: string; message?: string };
    } catch {
      body = {};
    }
    const result = await testN8nConnection(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "N8N connection test failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

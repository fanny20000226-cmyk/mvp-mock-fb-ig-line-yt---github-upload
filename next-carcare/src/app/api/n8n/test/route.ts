import { NextResponse } from "next/server";
import { testN8nConnection } from "@/lib/n8nIntegration";

export async function POST() {
  try {
    const result = await testN8nConnection();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "N8N connection test failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { testN8nConnection } from "@/lib/n8nIntegration";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

export async function POST(request: Request) {
  try {
    await requireServerProfile(request, ["admin"]);
    let body: { receiver?: string; message?: string } = {};
    try {
      body = (await request.json()) as { receiver?: string; message?: string };
    } catch {
      body = {};
    }
    const result = await testN8nConnection(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

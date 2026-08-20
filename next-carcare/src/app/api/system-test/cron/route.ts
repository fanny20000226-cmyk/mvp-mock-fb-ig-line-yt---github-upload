import { NextResponse } from "next/server";
import { assertSystemTestAccess, runSystemDataTest } from "@/lib/systemTestRunner";
import { apiError } from "@/lib/serverAuth";

export async function GET(request: Request) {
  try {
    const profile = await assertSystemTestAccess(request, "cron");
    const result = await runSystemDataTest({ mode: "cron", profile });
    return NextResponse.json(result, { status: result.status === "success" ? 200 : 500 });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ status: "failed", message: parsed.message }, { status: parsed.status });
  }
}

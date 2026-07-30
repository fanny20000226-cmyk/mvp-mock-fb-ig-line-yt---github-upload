import { NextResponse } from "next/server";
import { assertSystemTestAccess, runSystemDataTest } from "@/lib/systemTestRunner";

export async function GET(request: Request) {
  try {
    const profile = await assertSystemTestAccess(request, "cron");
    const result = await runSystemDataTest({ mode: "cron", profile });
    return NextResponse.json(result, { status: result.status === "success" ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "自動巡檢執行失敗";
    return NextResponse.json({ status: "failed", message }, { status: 500 });
  }
}

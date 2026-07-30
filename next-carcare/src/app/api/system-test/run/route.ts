import { NextResponse } from "next/server";
import { assertSystemTestAccess, runSystemDataTest } from "@/lib/systemTestRunner";

export async function POST(request: Request) {
  try {
    const profile = await assertSystemTestAccess(request, "manual");
    const result = await runSystemDataTest({ mode: "manual", profile });
    return NextResponse.json(result, { status: result.status === "success" ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "資料庫傳送測試執行失敗";
    return NextResponse.json({ status: "failed", message }, { status: 500 });
  }
}

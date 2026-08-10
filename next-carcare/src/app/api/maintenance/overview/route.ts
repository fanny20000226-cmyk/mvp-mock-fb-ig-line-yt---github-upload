import { NextResponse } from "next/server";
import { hasMaintenanceSession } from "@/lib/maintenanceAuth";
import { readMaintenanceOverview } from "@/lib/maintenanceReadOnly";

export async function GET() {
  if (!hasMaintenanceSession()) {
    return NextResponse.json({ ok: false, message: "請先登入維護平台。" }, { status: 401 });
  }

  try {
    const overview = await readMaintenanceOverview();
    return NextResponse.json({ ok: true, overview });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "監控資料讀取失敗。" },
      { status: 500 }
    );
  }
}

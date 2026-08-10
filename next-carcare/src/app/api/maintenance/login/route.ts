import { NextResponse } from "next/server";
import {
  createMaintenanceSession,
  setMaintenanceSessionCookie,
  verifyMaintenanceCredentials
} from "@/lib/maintenanceAuth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    account?: string;
    password?: string;
  };

  if (!verifyMaintenanceCredentials(body.account || "", body.password || "")) {
    return NextResponse.json({ ok: false, message: "維護帳號或密碼錯誤。" }, { status: 401 });
  }

  setMaintenanceSessionCookie(createMaintenanceSession());
  return NextResponse.json({ ok: true });
}

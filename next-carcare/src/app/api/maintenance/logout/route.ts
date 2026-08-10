import { NextResponse } from "next/server";
import { clearMaintenanceSessionCookie } from "@/lib/maintenanceAuth";

export async function POST() {
  clearMaintenanceSessionCookie();
  return NextResponse.json({ ok: true });
}

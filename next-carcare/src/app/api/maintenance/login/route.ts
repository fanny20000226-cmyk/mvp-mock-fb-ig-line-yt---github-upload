import { NextResponse } from "next/server";
import { createMaintenanceSession, verifyMaintenanceCredentials } from "@/lib/maintenanceAuth";

const cookieName = "peiway_maintenance_session";

function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/maintenance",
    maxAge: 60 * 60 * 8
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? ((await request.json().catch(() => ({}))) as { account?: string; password?: string })
    : Object.fromEntries((await request.formData()).entries());

  const account = String(body.account || "");
  const password = String(body.password || "");
  const isFormPost = !contentType.includes("application/json");

  if (!verifyMaintenanceCredentials(account, password)) {
    if (isFormPost) {
      return NextResponse.redirect(new URL("/maintenance/login?error=1", request.url), { status: 303 });
    }
    return NextResponse.json({ ok: false, message: "Maintenance account or password is incorrect." }, { status: 401 });
  }

  if (isFormPost) {
    const response = NextResponse.redirect(new URL("/maintenance/dashboard", request.url), { status: 303 });
    setSessionCookie(response, createMaintenanceSession());
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, createMaintenanceSession());
  return response;
}

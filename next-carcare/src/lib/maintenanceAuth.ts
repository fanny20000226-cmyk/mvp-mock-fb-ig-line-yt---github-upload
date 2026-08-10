import crypto from "crypto";
import { cookies } from "next/headers";

const cookieName = "peiway_maintenance_session";

function maintenanceUser() {
  return process.env.MAINTENANCE_MONITOR_USER || "maintenance";
}

function maintenancePassword() {
  return process.env.MAINTENANCE_MONITOR_PASSWORD || "peiway2026";
}

function sessionSecret() {
  return process.env.MAINTENANCE_SESSION_SECRET || maintenancePassword();
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export function verifyMaintenanceCredentials(account: string, password: string) {
  return account === maintenanceUser() && password === maintenancePassword();
}

export function createMaintenanceSession() {
  const payload = JSON.stringify({
    account: maintenanceUser(),
    iat: Date.now()
  });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function setMaintenanceSessionCookie(token: string) {
  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/maintenance",
    maxAge: 60 * 60 * 8
  });
}

export function clearMaintenanceSessionCookie() {
  cookies().set(cookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/maintenance",
    maxAge: 0
  });
}

export function hasMaintenanceSession() {
  const token = cookies().get(cookieName)?.value;
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      account?: string;
      iat?: number;
    };
    if (payload.account !== maintenanceUser() || !payload.iat) return false;
    return Date.now() - payload.iat < 1000 * 60 * 60 * 8;
  } catch {
    return false;
  }
}

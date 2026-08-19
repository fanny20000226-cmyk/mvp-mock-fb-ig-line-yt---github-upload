import { createClient } from "@supabase/supabase-js";
import type { Role, UserProfile } from "@/lib/permissions";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qhbdjeiieeiynuvlrltp.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-supabase-anon-key";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireServerProfile(request: Request, roles?: Role[]) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "登入狀態已失效，請重新登入。");
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth } = await client.auth.getUser(token);
  if (!auth.user) throw new HttpError(401, "登入狀態已失效，請重新登入。");
  const { data } = await client.from("users").select("id,tenant_id,shop_id,account,name,role,active").eq("id", auth.user.id).eq("active", true).single();
  if (!data) throw new HttpError(403, "找不到有效的員工權限資料。");
  const profile = data as UserProfile & { tenant_id: string | null };
  if (roles && !roles.includes(profile.role)) throw new HttpError(403, "此操作僅限管理員或店長。");
  return { profile, client, token };
}

export function apiError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "系統暫時無法完成操作。";
  return { status, message };
}


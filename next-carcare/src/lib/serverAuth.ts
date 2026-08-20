import { createClient } from "@supabase/supabase-js";
import type { Role, UserProfile } from "@/lib/permissions";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function requireScopedShopId(
  profile: UserProfile & { tenant_id: string | null },
  requestedShopId: unknown,
  options: { required?: boolean } = {},
) {
  const shopId = typeof requestedShopId === "string" && requestedShopId.trim()
    ? requestedShopId.trim()
    : profile.shop_id;

  if (!shopId) {
    if (options.required) throw new HttpError(400, "缺少門市資料，請先確認帳號與單據門市。");
    return null;
  }
  if (!profile.tenant_id) throw new HttpError(403, "帳號缺少租戶資料，請通知維護人員。");
  const tenantWideRoles: Role[] = ["admin", "hr", "finance"];
  if (!tenantWideRoles.includes(profile.role) && profile.shop_id !== shopId) {
    throw new HttpError(403, "不可操作其他門市的資料。");
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("shops")
    .select("id")
    .eq("id", shopId)
    .eq("tenant_id", profile.tenant_id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(403, "找不到可操作的門市資料。");
  return shopId;
}

export function requireN8nWebhookSecret(request: Request, body?: Record<string, unknown>) {
  const expected = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!expected) throw new HttpError(503, "系統尚未設定 N8N Webhook 安全密鑰。");
  const supplied = String(
      request.headers.get("x-peiway-webhook-secret") ||
      request.headers.get("x-n8n-webhook-secret") ||
      body?.callback_security_key ||
      body?.security_key ||
      "",
  ).trim();
  if (!supplied || supplied.length !== expected.length) throw new HttpError(401, "N8N 回呼驗證失敗。");

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  }
  if (mismatch !== 0) throw new HttpError(401, "N8N 回呼驗證失敗。");
}

export function apiError(error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "系統暫時無法完成操作。";
  return { status, message };
}

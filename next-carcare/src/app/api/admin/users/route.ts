import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Role } from "@/lib/permissions";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qhbdjeiieeiynuvlrltp.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-supabase-anon-key";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email: string;
    password: string;
    name: string;
    account: string;
    role: Role;
    shop_id: string | null;
  };

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ message: "缺少登入權杖" }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data: authUser } = await userClient.auth.getUser(token);
  const currentUserId = authUser.user?.id;

  if (!currentUserId) {
    return NextResponse.json({ message: "登入狀態失效" }, { status: 401 });
  }

  const { data: currentProfile } = await userClient
    .from("users")
    .select("role")
    .eq("id", currentUserId)
    .single();

  if (currentProfile?.role !== "admin") {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true
  });

  if (error || !data.user) {
    return NextResponse.json(
      { message: error?.message || "建立帳號失敗" },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("users").insert({
    id: data.user.id,
    shop_id: body.shop_id || null,
    account: body.account,
    name: body.name,
    role: body.role,
    active: true
  });

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.user.id });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id: string;
    active?: boolean;
    password?: string;
    role?: Role;
    shop_id?: string | null;
  };

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ message: "缺少登入權杖" }, { status: 401 });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data: authUser } = await userClient.auth.getUser(token);
  const currentUserId = authUser.user?.id;

  if (!currentUserId) {
    return NextResponse.json({ message: "登入狀態失效" }, { status: 401 });
  }

  const { data: currentProfile } = await userClient
    .from("users")
    .select("role")
    .eq("id", currentUserId)
    .single();

  if (currentProfile?.role !== "admin") {
    return NextResponse.json({ message: "權限不足" }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const profilePatch: Record<string, boolean | string | null> = {};
  if (typeof body.active === "boolean") profilePatch.active = body.active;
  if (body.role) profilePatch.role = body.role;
  if (Object.prototype.hasOwnProperty.call(body, "shop_id")) profilePatch.shop_id = body.shop_id || null;

  if (Object.keys(profilePatch).length) {
    const { error } = await admin.from("users").update(profilePatch).eq("id", body.id);
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  }

  if (body.password) {
    const { error } = await admin.auth.admin.updateUserById(body.id, {
      password: body.password
    });
    if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type BootstrapBody = {
  email?: string;
  password?: string;
  name?: string;
  account?: string;
  shop_id?: string | null;
  setupKey?: string;
};

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

async function getActiveAdminCount(admin: AdminClient) {
  const { count, error } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("active", true);

  if (error) throw error;
  return count ?? 0;
}

async function resolveShopId(admin: AdminClient, preferredShopId?: string | null) {
  const cleanShopId = preferredShopId?.trim();
  if (cleanShopId) return cleanShopId;

  const { data } = await admin
    .from("shops")
    .select("id")
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

async function findAuthUserByEmail(admin: AdminClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (match) return match;
    if (data.users.length < 100) return null;
  }

  return null;
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const adminCount = await getActiveAdminCount(admin);

    return NextResponse.json({
      ok: true,
      needsSetup: adminCount === 0,
      adminCount
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        needsSetup: false,
        message:
          error instanceof Error
            ? error.message
            : "無法檢查管理員初始化狀態。"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BootstrapBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const name = body.name?.trim() || "總管理員";
    const account = body.account?.trim() || "admin";
    const requiredSetupKey = process.env.ADMIN_BOOTSTRAP_KEY;

    if (requiredSetupKey && body.setupKey !== requiredSetupKey) {
      return NextResponse.json(
        { ok: false, message: "初始化金鑰不正確。" },
        { status: 403 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, message: "請輸入有效的管理員信箱。" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "密碼至少需要 8 碼。" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const adminCount = await getActiveAdminCount(admin);
    if (adminCount > 0) {
      return NextResponse.json(
        { ok: false, message: "系統已建立管理員，初始化入口已鎖定。" },
        { status: 409 }
      );
    }

    const shopId = await resolveShopId(admin, body.shop_id);
    const createResult = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        account,
        role: "admin"
      }
    });

    let authUser = createResult.data.user;

    if (createResult.error || !authUser) {
      const message = createResult.error?.message ?? "";
      const alreadyExists = /already|registered|exists/i.test(message);

      if (!alreadyExists) {
        return NextResponse.json(
          { ok: false, message: `建立 Auth 帳號失敗：${message}` },
          { status: 400 }
        );
      }

      authUser = await findAuthUserByEmail(admin, email);
      if (!authUser) {
        return NextResponse.json(
          { ok: false, message: "Auth 帳號已存在，但無法取得對應使用者。" },
          { status: 400 }
        );
      }

      const { error: updatePasswordError } = await admin.auth.admin.updateUserById(
        authUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: {
            name,
            account,
            role: "admin"
          }
        }
      );

      if (updatePasswordError) {
        return NextResponse.json(
          {
            ok: false,
            message: `更新既有 Auth 帳號密碼失敗：${updatePasswordError.message}`
          },
          { status: 400 }
        );
      }
    }

    const { error: profileError } = await admin.from("users").upsert(
      {
        id: authUser.id,
        shop_id: shopId,
        account,
        name,
        role: "admin",
        active: true
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.json(
        { ok: false, message: `建立權限資料失敗：${profileError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: authUser.id,
      shop_id: shopId,
      email,
      account,
      role: "admin",
      message: "管理員帳號與權限資料已建立。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "建立管理員帳號時發生未知錯誤。"
      },
      { status: 500 }
    );
  }
}

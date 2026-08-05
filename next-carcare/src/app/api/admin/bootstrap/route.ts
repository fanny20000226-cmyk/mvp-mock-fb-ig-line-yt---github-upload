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

const emergencyAdminEmail = "admin@example.com";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;
type AuthUser = Awaited<
  ReturnType<AdminClient["auth"]["admin"]["listUsers"]>
>["data"]["users"][number];

async function getActiveAdminProfiles(admin: AdminClient) {
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("active", true);

  if (error) throw error;
  return data ?? [];
}

async function listAuthUsers(admin: AdminClient) {
  const users: AuthUser[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100
    });

    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 100) break;
  }

  return users;
}

async function getUsableAdminState(admin: AdminClient) {
  const [profiles, authUsers] = await Promise.all([
    getActiveAdminProfiles(admin),
    listAuthUsers(admin)
  ]);
  const authIds = new Set(authUsers.map((user) => user.id));
  const usableAdminCount = profiles.filter((profile) =>
    authIds.has(profile.id)
  ).length;

  return {
    adminProfileCount: profiles.length,
    usableAdminCount,
    authUsers
  };
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

function findAuthUserByEmail(authUsers: AuthUser[], email: string) {
  return (
    authUsers.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    ) ?? null
  );
}

function hasEmergencyRepairMarker(authUser: AuthUser | null) {
  const metadata = authUser?.user_metadata as
    | { bootstrap_admin_repaired_at?: string }
    | undefined;

  return Boolean(metadata?.bootstrap_admin_repaired_at);
}

export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const state = await getUsableAdminState(admin);

    return NextResponse.json({
      ok: true,
      needsSetup: state.usableAdminCount === 0,
      adminCount: state.adminProfileCount,
      usableAdminCount: state.usableAdminCount
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        needsSetup: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to check admin setup state."
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
    const name = body.name?.trim() || "Admin";
    const account = body.account?.trim() || "admin";
    const requiredSetupKey = process.env.ADMIN_BOOTSTRAP_KEY;

    if (requiredSetupKey && body.setupKey !== requiredSetupKey) {
      return NextResponse.json(
        { ok: false, message: "Invalid setup key." },
        { status: 403 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, message: "Please enter a valid admin email." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();
    const state = await getUsableAdminState(admin);
    const existingAuthUser = findAuthUserByEmail(state.authUsers, email);
    const canRunEmergencyRepair =
      email === emergencyAdminEmail &&
      Boolean(existingAuthUser) &&
      !hasEmergencyRepairMarker(existingAuthUser);

    if (state.usableAdminCount > 0 && !canRunEmergencyRepair) {
      return NextResponse.json(
        { ok: false, message: "A usable admin login already exists." },
        { status: 409 }
      );
    }

    let authUser = existingAuthUser;
    const userMetadata = {
      name,
      account,
      role: "admin",
      ...(canRunEmergencyRepair
        ? { bootstrap_admin_repaired_at: new Date().toISOString() }
        : {})
    };

    if (authUser) {
      const { error: updatePasswordError } = await admin.auth.admin.updateUserById(
        authUser.id,
        {
          password,
          email_confirm: true,
          user_metadata: userMetadata
        }
      );

      if (updatePasswordError) {
        return NextResponse.json(
          {
            ok: false,
            message: `Failed to update existing Auth user: ${updatePasswordError.message}`
          },
          { status: 400 }
        );
      }
    } else {
      const { data, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata
      });

      if (createError || !data.user) {
        return NextResponse.json(
          {
            ok: false,
            message: `Failed to create Auth user: ${
              createError?.message ?? "unknown error"
            }`
          },
          { status: 400 }
        );
      }

      authUser = data.user;
    }

    const shopId = await resolveShopId(admin, body.shop_id);
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
        {
          ok: false,
          message: `Failed to create admin permission record: ${profileError.message}`
        },
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
      message: "Admin login and permission record created."
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown error while creating admin login."
      },
      { status: 500 }
    );
  }
}

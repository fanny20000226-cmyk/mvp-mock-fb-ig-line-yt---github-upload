import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Role } from "@/lib/permissions";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qhbdjeiieeiynuvlrltp.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-supabase-anon-key";

const allowedRoles: Role[] = ["admin", "shop_manager", "vice_manager", "worker"];

type QuoteRecord = {
  id: string;
  shop_id?: string | null;
  store_id?: string | null;
  quote_no?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  plate_no?: string | null;
  brand?: string | null;
  model?: string | null;
  car_id?: string | null;
  total_amount?: number | null;
  final_amount?: number | null;
  status?: string | null;
  remark?: string | null;
};

async function getCurrentProfile(token: string) {
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const { data: authUser, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authUser.user?.id) {
    throw new Error("登入狀態已失效，請重新登入。");
  }

  const { data, error } = await userClient
    .from("users")
    .select("id, shop_id, account, name, role, active")
    .eq("id", authUser.user.id)
    .eq("active", true)
    .single();

  if (error || !data) throw new Error("找不到登入使用者資料。");
  if (!allowedRoles.includes(data.role as Role)) throw new Error("此帳號沒有轉工單權限。");
  return data as { id: string; shop_id: string | null; role: Role };
}

async function ensureCar(admin: ReturnType<typeof getSupabaseAdmin>, profileShopId: string, quote: QuoteRecord) {
  if (quote.car_id) return quote.car_id;

  const plateNo = (quote.plate_no || "").trim();
  if (!plateNo) throw new Error("這張報價單沒有車牌，請先補車牌再轉工單。");

  const { data: existing, error: findError } = await admin
    .from("cars")
    .select("id")
    .eq("shop_id", profileShopId)
    .eq("plate_no", plateNo)
    .limit(1);

  if (findError) throw findError;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data, error } = await admin
    .from("cars")
    .insert({
      shop_id: profileShopId,
      customer_name: quote.customer_name || "未命名客戶",
      customer_phone: quote.customer_phone || "",
      plate_no: plateNo,
      brand: quote.brand || "",
      model: quote.model || "",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) throw error || new Error("建立車輛資料失敗。");
  return data.id as string;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String((error as { message: unknown }).message);
  return "轉工單失敗。";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ message: "請先登入後再轉工單。" }, { status: 401 });
    }

    const body = (await request.json()) as { quoteId?: string };
    if (!body.quoteId) {
      return NextResponse.json({ message: "缺少報價單 ID。" }, { status: 400 });
    }

    const profile = await getCurrentProfile(token);
    if (!profile.shop_id) {
      return NextResponse.json({ message: "此帳號尚未綁定門市，無法轉工單。" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: quote, error: quoteError } = await admin
      .from("quotations")
      .select("*")
      .eq("id", body.quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ message: quoteError?.message || "找不到報價單。" }, { status: 404 });
    }

    const typedQuote = quote as QuoteRecord;
    const quoteShopId = typedQuote.shop_id || typedQuote.store_id || profile.shop_id;
    if (profile.role !== "admin" && quoteShopId !== profile.shop_id) {
      return NextResponse.json({ message: "不能轉換其他門市的報價單。" }, { status: 403 });
    }

    if (typedQuote.status === "converted") {
      return NextResponse.json({ message: "這張報價單已經轉為工單。" }, { status: 409 });
    }

    const carId = await ensureCar(admin, quoteShopId, typedQuote);
    const orderNo = `W${Date.now()}`;
    const totalAmount = Number(typedQuote.final_amount || typedQuote.total_amount || 0);
    const remark = `由報價單 ${typedQuote.quote_no || typedQuote.id} 轉入`;

    const insertAttempts: Record<string, unknown>[] = [
      {
        shop_id: quoteShopId,
        store_id: quoteShopId,
        car_id: carId,
        quotation_id: typedQuote.id,
        order_no: orderNo,
        status: "pending",
        total_amount: totalAmount,
        paid_amount: 0,
        remark,
        created_by: profile.id,
      },
      {
        shop_id: quoteShopId,
        car_id: carId,
        quotation_id: typedQuote.id,
        order_no: orderNo,
        status: "pending",
        total_amount: totalAmount,
        paid_amount: 0,
        remark,
      },
      {
        shop_id: quoteShopId,
        car_id: carId,
        order_no: orderNo,
        status: "pending",
        total_amount: totalAmount,
        remark,
      },
    ];

    let createdOrder: { id: string } | null = null;
    let lastInsertError: unknown = null;

    for (const payload of insertAttempts) {
      const { data, error } = await admin.from("construction_orders").insert(payload).select("id").single();
      if (!error && data?.id) {
        createdOrder = data as { id: string };
        break;
      }
      lastInsertError = error;
    }

    if (!createdOrder) {
      throw lastInsertError || new Error("建立施工工單失敗。");
    }

    const { error: updateError } = await admin
      .from("quotations")
      .update({ status: "converted" })
      .eq("id", typedQuote.id);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, orderId: createdOrder.id, orderNo });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 400 });
  }
}

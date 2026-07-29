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

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

type QuoteRecord = {
  id: string;
  shop_id?: string | null;
  store_id?: string | null;
  quote_no?: string | null;
  customer_id?: string | null;
  car_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  plate_no?: string | null;
  brand?: string | null;
  model?: string | null;
  total_amount?: number | null;
  final_amount?: number | null;
  status?: string | null;
  remark?: string | null;
};

type ConvertBody = {
  quoteId?: string;
  responsibleStaffId?: string;
  paidAmount?: number | string;
  totalAmount?: number | string;
  serviceNote?: string;
};

async function getCurrentProfile(token: string) {
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: authUser, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authUser.user?.id) throw new Error("登入狀態已失效，請重新登入。");

  const { data, error } = await userClient
    .from("users")
    .select("id, shop_id, account, name, role, active")
    .eq("id", authUser.user.id)
    .eq("active", true)
    .single();

  if (error || !data) throw new Error("找不到可用的使用者資料。");
  if (!allowedRoles.includes(data.role as Role)) throw new Error("此帳號沒有轉工單權限。");

  return data as { id: string; shop_id: string | null; role: Role };
}

function clean(value?: string | null) {
  return (value || "").trim();
}

function getWriteClient(token: string): SupabaseAdmin {
  try {
    return getSupabaseAdmin();
  } catch (error) {
    if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
    }
    throw error;
  }
}

async function ensureCustomer(admin: SupabaseAdmin, shopId: string, quote: QuoteRecord) {
  if (quote.customer_id) return quote.customer_id;

  const phone = clean(quote.customer_phone);
  const name = clean(quote.customer_name) || "未命名客戶";
  const baseQuery = admin.from("customers").select("id").eq("store_id", shopId).limit(1);
  let customerResult = phone
    ? await baseQuery.eq("phone", phone)
    : await baseQuery.eq("name", name);

  if (customerResult.error) {
    const fallbackQuery = admin.from("customers").select("id").eq("shop_id", shopId).limit(1);
    customerResult = phone
      ? await fallbackQuery.eq("phone", phone)
      : await fallbackQuery.eq("name", name);
  }

  const { data: existing, error: findError } = customerResult;
  if (findError) throw findError;
  if (existing?.[0]?.id) return existing[0].id as string;

  const insertAttempts: Record<string, unknown>[] = [
    {
      name,
      phone,
      store_id: shopId,
      updated_at: new Date().toISOString(),
    },
    {
      name,
      phone,
      shop_id: shopId,
    },
    {
      name,
      phone,
    },
  ];

  let data: { id: string } | null = null;
  let error: unknown = null;
  for (const payload of insertAttempts) {
    const result = await admin.from("customers").insert(payload).select("id").single();
    if (!result.error && result.data?.id) {
      data = result.data as { id: string };
      error = null;
      break;
    }
    error = result.error;
  }

  if (error || !data?.id) throw error || new Error("建立客戶資料失敗。");
  return data.id as string;
}

async function ensureCar(admin: SupabaseAdmin, shopId: string, quote: QuoteRecord, customerId: string) {
  if (quote.car_id) return quote.car_id;

  const plateNo = clean(quote.plate_no);
  if (!plateNo) throw new Error("這張報價單沒有車牌，請先補車牌再轉工單。");

  let existingResult = await admin
    .from("cars")
    .select("id, customer_id")
    .eq("shop_id", shopId)
    .eq("plate_no", plateNo)
    .limit(1);

  if (existingResult.error) {
    existingResult = await admin
      .from("cars")
      .select("id, customer_id")
      .eq("store_id", shopId)
      .eq("license_plate", plateNo)
      .limit(1);
  }

  const { data: existing, error: findError } = existingResult;
  if (findError) throw findError;
  if (existing?.[0]?.id) {
    const patch: Record<string, unknown> = { customer_id: customerId, updated_at: new Date().toISOString() };
    const { error: updateError } = await admin.from("cars").update(patch).eq("id", existing[0].id);
    if (updateError) {
      const { error: fallbackUpdateError } = await admin.from("cars").update({ customer_id: customerId }).eq("id", existing[0].id);
      if (fallbackUpdateError) throw fallbackUpdateError;
    }
    return existing[0].id as string;
  }

  const insertAttempts: Record<string, unknown>[] = [
    {
      shop_id: shopId,
      store_id: shopId,
      customer_id: customerId,
      customer_name: clean(quote.customer_name) || "未命名客戶",
      customer_phone: clean(quote.customer_phone),
      plate_no: plateNo,
      license_plate: plateNo,
      brand: clean(quote.brand),
      model: clean(quote.model),
      updated_at: new Date().toISOString(),
    },
    {
      shop_id: shopId,
      customer_id: customerId,
      customer_name: clean(quote.customer_name) || "未命名客戶",
      customer_phone: clean(quote.customer_phone),
      plate_no: plateNo,
      brand: clean(quote.brand),
      model: clean(quote.model),
    },
    {
      store_id: shopId,
      customer_id: customerId,
      license_plate: plateNo,
      brand: clean(quote.brand),
      model: clean(quote.model),
    },
    {
      customer_id: customerId,
      license_plate: plateNo,
      brand: clean(quote.brand),
      model: clean(quote.model),
    },
  ];

  let data: { id: string } | null = null;
  let error: unknown = null;

  for (const payload of insertAttempts) {
    const result = await admin.from("cars").insert(payload).select("id").single();
    if (!result.error && result.data?.id) {
      data = result.data as { id: string };
      error = null;
      break;
    }
    error = result.error;
  }

  if (error || !data?.id) throw error || new Error("建立車輛資料失敗。");
  return data.id as string;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "轉工單失敗。";
}

export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
    if (!token) return NextResponse.json({ message: "請先登入後再轉工單。" }, { status: 401 });

    const body = (await request.json()) as ConvertBody;
    if (!body.quoteId) return NextResponse.json({ message: "缺少報價單 ID。" }, { status: 400 });

    const profile = await getCurrentProfile(token);
    if (!profile.shop_id) {
      return NextResponse.json({ message: "此帳號尚未綁定門市，無法轉工單。" }, { status: 400 });
    }

    const admin = getWriteClient(token);
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
      return NextResponse.json({ message: "沒有權限轉換其他門市的報價單。" }, { status: 403 });
    }

    if (typedQuote.status === "converted") {
      return NextResponse.json({ message: "這張報價單已經轉為工單。" }, { status: 409 });
    }

    const customerId = await ensureCustomer(admin, quoteShopId, typedQuote);
    const carId = await ensureCar(admin, quoteShopId, typedQuote, customerId);
    const totalAmount = Number(body.totalAmount || typedQuote.final_amount || typedQuote.total_amount || 0);
    const paidAmount = Number(body.paidAmount || 0);
    const orderNo = `W${Date.now()}`;
    const remark = clean(body.serviceNote) || `由報價單 ${typedQuote.quote_no || typedQuote.id} 轉入`;

    const insertAttempts: Record<string, unknown>[] = [
      {
        shop_id: quoteShopId,
        store_id: quoteShopId,
        car_id: carId,
        quotation_id: typedQuote.id,
        order_no: orderNo,
        status: "pending",
        total_amount: totalAmount,
        paid_amount: paidAmount,
        responsible_staff_id: clean(body.responsibleStaffId) || null,
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
        paid_amount: paidAmount,
        remark,
      },
      {
        shop_id: quoteShopId,
        car_id: carId,
        order_no: orderNo,
        status: "pending",
        total_amount: totalAmount,
        paid_amount: paidAmount,
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

    if (!createdOrder) throw lastInsertError || new Error("建立施工單失敗。");

    const quoteUpdateAttempts: Record<string, unknown>[] = [
      {
        status: "converted",
        customer_id: customerId,
        car_id: carId,
        updated_at: new Date().toISOString(),
      },
      {
        status: "converted",
        customer_id: customerId,
        car_id: carId,
      },
      {
        status: "converted",
      },
    ];

    let quoteUpdated = false;
    let lastQuoteUpdateError: unknown = null;
    for (const payload of quoteUpdateAttempts) {
      const { error } = await admin.from("quotations").update(payload).eq("id", typedQuote.id);
      if (!error) {
        quoteUpdated = true;
        break;
      }
      lastQuoteUpdateError = error;
    }

    if (!quoteUpdated) throw lastQuoteUpdateError || new Error("施工單已建立，但報價單狀態回寫失敗。");

    return NextResponse.json({ ok: true, orderId: createdOrder.id, orderNo, carId, customerId });
  } catch (error) {
    return NextResponse.json({ message: errorMessage(error) }, { status: 400 });
  }
}

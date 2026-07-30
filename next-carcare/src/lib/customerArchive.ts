import type { UserProfile } from "./permissions";
import { supabase } from "./supabase";

type ArchiveInput = {
  customer_name: string;
  customer_phone?: string;
  plate_no: string;
  brand?: string;
  model?: string;
  year?: number | null;
  color?: string;
};

function clean(value?: string | null) {
  return (value || "").trim();
}

function notifyCustomerSheetSync(input: ArchiveInput & { customer_id: string; car_id: string; shop_id: string }) {
  fetch("/api/n8n/realtime-sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sync_type: "customer",
      source_table: "customers",
      operation: "upsert",
      unique_key: input.customer_id,
      store_id: input.shop_id,
      plate: input.plate_no,
      model: input.model || null,
      record: {
        id: input.customer_id,
        car_id: input.car_id,
        name: clean(input.customer_name),
        phone: clean(input.customer_phone),
        license_plate: clean(input.plate_no),
        plate_no: clean(input.plate_no),
        brand: clean(input.brand),
        model: clean(input.model),
        year: input.year || null,
        color: clean(input.color),
        store_id: input.shop_id,
        source_channel: "carcare-system",
        updated_at: new Date().toISOString()
      }
    })
  }).catch(() => {
    // N8N/Google Sheets sync must never block the core customer save flow.
  });
}

async function ensureCustomer(profile: UserProfile, input: ArchiveInput) {
  if (!profile.shop_id) throw new Error("目前帳號尚未綁定門市，無法建立客戶資料。");

  const name = clean(input.customer_name) || "未命名客戶";
  const phone = clean(input.customer_phone);

  const baseQuery = supabase.from("customers").select("id").eq("store_id", profile.shop_id).limit(1);
  let customerResult = phone
    ? await baseQuery.eq("phone", phone)
    : await baseQuery.eq("name", name);

  if (customerResult.error) {
    const fallbackQuery = supabase.from("customers").select("id").eq("shop_id", profile.shop_id).limit(1);
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
      store_id: profile.shop_id,
      updated_at: new Date().toISOString(),
    },
    {
      name,
      phone,
      shop_id: profile.shop_id,
    },
    {
      name,
      phone,
    },
  ];

  let data: { id: string } | null = null;
  let error: unknown = null;
  for (const payload of insertAttempts) {
    const result = await supabase.from("customers").insert(payload).select("id").single();
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

export async function ensureCustomerVehicleArchive(profile: UserProfile, input: ArchiveInput) {
  if (!profile.shop_id) throw new Error("目前帳號尚未綁定門市，無法建立車輛資料。");

  const plateNo = clean(input.plate_no);
  if (!plateNo) throw new Error("請先填寫車牌號碼。");

  const customerId = await ensureCustomer(profile, input);
  let carResult = await supabase
    .from("cars")
    .select("id, customer_id")
    .eq("shop_id", profile.shop_id)
    .eq("plate_no", plateNo)
    .limit(1);

  if (carResult.error) {
    carResult = await supabase
      .from("cars")
      .select("id, customer_id")
      .eq("store_id", profile.shop_id)
      .eq("license_plate", plateNo)
      .limit(1);
  }

  const { data: existingCars, error: findError } = carResult;
  if (findError) throw findError;

  const payload = {
    customer_id: customerId,
    customer_name: clean(input.customer_name) || "未命名客戶",
    customer_phone: clean(input.customer_phone),
    plate_no: plateNo,
    license_plate: plateNo,
    brand: clean(input.brand),
    model: clean(input.model),
    year: input.year || null,
    color: clean(input.color),
    updated_at: new Date().toISOString(),
  };

  const existingId = existingCars?.[0]?.id as string | undefined;
  if (existingId) {
    const { error } = await supabase.from("cars").update(payload).eq("id", existingId);
    if (error) {
      const { error: fallbackError } = await supabase
        .from("cars")
        .update({ customer_id: customerId, license_plate: plateNo, brand: clean(input.brand), model: clean(input.model) })
        .eq("id", existingId);
      if (fallbackError) throw fallbackError;
    }
    await attachPlateImagesToCar(profile.shop_id, existingId, plateNo);
    notifyCustomerSheetSync({ ...input, customer_id: customerId, car_id: existingId, shop_id: profile.shop_id });
    return existingId;
  }

  const insertAttempts: Record<string, unknown>[] = [
    {
      shop_id: profile.shop_id,
      store_id: profile.shop_id,
      ...payload,
    },
    {
      shop_id: profile.shop_id,
      customer_id: customerId,
      customer_name: clean(input.customer_name) || "未命名客戶",
      customer_phone: clean(input.customer_phone),
      plate_no: plateNo,
      brand: clean(input.brand),
      model: clean(input.model),
    },
    {
      store_id: profile.shop_id,
      customer_id: customerId,
      license_plate: plateNo,
      brand: clean(input.brand),
      model: clean(input.model),
    },
    {
      customer_id: customerId,
      license_plate: plateNo,
      brand: clean(input.brand),
      model: clean(input.model),
    },
  ];

  let data: { id: string } | null = null;
  let error: unknown = null;
  for (const attempt of insertAttempts) {
    const result = await supabase.from("cars").insert(attempt).select("id").single();
    if (!result.error && result.data?.id) {
      data = result.data as { id: string };
      error = null;
      break;
    }
    error = result.error;
  }

  if (error || !data?.id) throw error || new Error("建立車輛資料失敗。");

  const newCarId = data.id as string;
  await attachPlateImagesToCar(profile.shop_id, newCarId, plateNo);
  notifyCustomerSheetSync({ ...input, customer_id: customerId, car_id: newCarId, shop_id: profile.shop_id });
  return newCarId;
}

export async function attachPlateImagesToCar(shopId: string, carId: string, plateNo: string) {
  const { error } = await supabase
    .from("image_annotations")
    .update({ car_id: carId })
    .eq("shop_id", shopId)
    .contains("annot_data", { plate_no: plateNo });

  if (error) throw error;
}

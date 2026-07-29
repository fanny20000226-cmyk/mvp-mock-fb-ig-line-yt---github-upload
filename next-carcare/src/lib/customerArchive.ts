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

async function ensureCustomer(profile: UserProfile, input: ArchiveInput) {
  if (!profile.shop_id) return null;

  const name = input.customer_name?.trim() || "未命名客戶";
  const phone = input.customer_phone?.trim() || "";

  const baseQuery = supabase.from("customers").select("id").eq("store_id", profile.shop_id).limit(1);
  const { data: existing, error: findError } = phone
    ? await baseQuery.eq("phone", phone)
    : await baseQuery.eq("name", name);

  if (findError) throw findError;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      phone,
      store_id: profile.shop_id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data?.id) throw error || new Error("建立客戶資料失敗");
  return data.id as string;
}

export async function ensureCustomerVehicleArchive(profile: UserProfile, input: ArchiveInput) {
  const plateNo = input.plate_no.trim();
  if (!profile.shop_id || !plateNo) return null;

  const customerId = await ensureCustomer(profile, input);

  const { data: existingCars, error: findError } = await supabase
    .from("cars")
    .select("id, customer_id")
    .eq("shop_id", profile.shop_id)
    .eq("plate_no", plateNo)
    .limit(1);

  if (findError) throw findError;

  const existingId = existingCars?.[0]?.id as string | undefined;
  const payload = {
    customer_id: customerId,
    customer_name: input.customer_name || "未命名客戶",
    customer_phone: input.customer_phone || "",
    plate_no: plateNo,
    license_plate: plateNo,
    brand: input.brand || "",
    model: input.model || "",
    year: input.year || null,
    color: input.color || "",
    updated_at: new Date().toISOString(),
  };

  if (existingId) {
    const { error } = await supabase
      .from("cars")
      .update(payload)
      .eq("id", existingId);

    if (error) throw error;
    await attachPlateImagesToCar(profile.shop_id, existingId, plateNo);
    return existingId;
  }

  const { data, error } = await supabase
    .from("cars")
    .insert({
      shop_id: profile.shop_id,
      store_id: profile.shop_id,
      ...payload,
    })
    .select("id")
    .single();

  if (error || !data) throw error || new Error("建立車輛資料失敗");

  const newCarId = data.id as string;
  await attachPlateImagesToCar(profile.shop_id, newCarId, plateNo);
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

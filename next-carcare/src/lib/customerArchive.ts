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

export async function ensureCustomerVehicleArchive(profile: UserProfile, input: ArchiveInput) {
  const plateNo = input.plate_no.trim();
  if (!profile.shop_id || !plateNo) return null;

  const { data: existingCars, error: findError } = await supabase
    .from("cars")
    .select("id")
    .eq("shop_id", profile.shop_id)
    .eq("plate_no", plateNo)
    .limit(1);

  if (findError) throw findError;

  const existingId = existingCars?.[0]?.id as string | undefined;
  const payload = {
    customer_name: input.customer_name || "未命名客戶",
    customer_phone: input.customer_phone || "",
    plate_no: plateNo,
    brand: input.brand || "",
    model: input.model || "",
    year: input.year || null,
    color: input.color || "",
    updated_at: new Date().toISOString()
  };

  const carId = existingId || "";
  if (carId) {
    const { error } = await supabase
      .from("cars")
      .update({
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        updated_at: payload.updated_at
      })
      .eq("id", carId);
    if (error) throw error;
    await attachPlateImagesToCar(profile.shop_id, carId, plateNo);
    return carId;
  }

  const { data, error } = await supabase
    .from("cars")
    .insert({
      shop_id: profile.shop_id,
      ...payload
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

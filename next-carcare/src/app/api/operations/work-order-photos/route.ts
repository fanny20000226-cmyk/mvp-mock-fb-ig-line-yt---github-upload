import { NextResponse } from "next/server";
import { apiError, HttpError, requireServerProfile } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CAR_IMAGE_BUCKET,
  customerFolderManifestPath,
  customerWorkOrderPhotoPath,
  workOrderFolderManifestPath,
} from "@/lib/carPhotoStorage";

type JsonRow = Record<string, unknown>;
type Phase = "before" | "after";

function value(row: JsonRow | null | undefined, key: string) {
  return String(row?.[key] || "").trim();
}

async function loadOrderContext(request: Request, orderId: string) {
  const { profile } = await requireServerProfile(request);
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin.from("construction_orders").select("*").eq("id", orderId).single();
  if (error || !order) throw new HttpError(404, "找不到施工單，請重新整理後再試。");

  const orderRow = order as JsonRow;
  let carId = value(orderRow, "car_id");
  let customerId = value(orderRow, "customer_id");
  let shopId = value(orderRow, "shop_id") || value(orderRow, "store_id");
  const quotationId = value(orderRow, "quotation_id");
  let car: JsonRow | null = null;
  let quote: JsonRow | null = null;

  if (quotationId) {
    const result = await admin.from("quotations").select("*").eq("id", quotationId).maybeSingle();
    quote = (result.data as JsonRow | null) || null;
    carId ||= value(quote, "car_id");
    customerId ||= value(quote, "customer_id");
    shopId ||= value(quote, "shop_id") || value(quote, "store_id");
  }
  if (carId) {
    const result = await admin.from("cars").select("*").eq("id", carId).maybeSingle();
    car = (result.data as JsonRow | null) || null;
    customerId ||= value(car, "customer_id");
    shopId ||= value(car, "shop_id") || value(car, "store_id");
  }

  if (!shopId) throw new HttpError(400, "施工單尚未綁定門市，請通知管理員補齊資料。");
  if (profile.role !== "admin" && profile.shop_id !== shopId) {
    throw new HttpError(403, "沒有權限讀取其他門市的施工照片。");
  }
  if (profile.role === "admin" && profile.tenant_id) {
    const { data: shop } = await admin.from("shops").select("tenant_id").eq("id", shopId).maybeSingle();
    if (shop?.tenant_id && String(shop.tenant_id) !== profile.tenant_id) {
      throw new HttpError(403, "沒有權限讀取其他公司的施工照片。");
    }
  }

  return {
    admin,
    profile,
    order: orderRow,
    orderId,
    orderNo: value(orderRow, "order_no") || orderId,
    quotationId,
    shopId,
    carId,
    customerId,
  };
}

async function writeManifest(path: string, payload: JsonRow) {
  const admin = getSupabaseAdmin();
  const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const { error } = await admin.storage.from(CAR_IMAGE_BUCKET).upload(path, blob, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

export async function GET(request: Request) {
  try {
    const orderId = new URL(request.url).searchParams.get("orderId")?.trim() || "";
    if (!orderId) throw new HttpError(400, "缺少施工單 ID。");
    const context = await loadOrderContext(request, orderId);
    const { data, error } = await context.admin
      .from("image_annotations")
      .select("id,image_url,annot_data,created_at")
      .eq("shop_id", context.shopId)
      .contains("annot_data", { construction_order_id: orderId })
      .order("created_at", { ascending: false })
      .limit(160);
    if (error) throw error;

    const photos = (data || []).map((row) => {
      const metadata = (row.annot_data || {}) as JsonRow;
      const phase: Phase = value(metadata, "phase") === "after" || value(metadata, "type").includes("after") ? "after" : "before";
      return { id: row.id, image_url: row.image_url, phase, created_at: row.created_at };
    });
    return NextResponse.json({ photos });
  } catch (error) {
    const result = apiError(error);
    console.error("work order photo list raw error", error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const orderId = String(form.get("orderId") || "").trim();
    const phase = String(form.get("phase") || "before") as Phase;
    const file = form.get("file");
    if (!orderId) throw new HttpError(400, "缺少施工單 ID。");
    if (phase !== "before" && phase !== "after") throw new HttpError(400, "施工照片分類不正確。");
    if (!(file instanceof File)) throw new HttpError(400, "請先選擇要上傳的照片。");
    if (!file.type.startsWith("image/")) throw new HttpError(400, "僅支援圖片格式。");
    if (file.size > 4 * 1024 * 1024) throw new HttpError(400, "單張照片不可超過 4MB，請重新拍攝或縮小圖片後再試。");

    const context = await loadOrderContext(request, orderId);
    if (!context.customerId) throw new HttpError(400, "施工單尚未綁定客戶，請先補齊客戶資料。");
    if (!context.carId) throw new HttpError(400, "施工單尚未綁定車輛，請先補齊車輛資料。");

    const path = customerWorkOrderPhotoPath({
      shopId: context.shopId,
      customerId: context.customerId,
      carId: context.carId,
      workOrderId: orderId,
      phase,
      fileName: file.name || "photo.jpg",
    });
    const { error: uploadError } = await context.admin.storage.from(CAR_IMAGE_BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const publicUrl = context.admin.storage.from(CAR_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    const uploadedAt = new Date().toISOString();
    const { data: annotation, error: insertError } = await context.admin
      .from("image_annotations")
      .insert({
        shop_id: context.shopId,
        image_url: publicUrl,
        annot_data: {
          type: `work_order_${phase}`,
          phase,
          customer_id: context.customerId,
          car_id: context.carId,
          construction_order_id: orderId,
          order_no: context.orderNo,
          quotation_id: context.quotationId || null,
          storage_path: path,
          uploaded_at: uploadedAt,
        },
        created_by: context.profile.id,
      })
      .select("id")
      .single();
    if (insertError) {
      await context.admin.storage.from(CAR_IMAGE_BUCKET).remove([path]);
      throw insertError;
    }

    await Promise.all([
      writeManifest(customerFolderManifestPath(context.shopId, context.customerId), {
        customer_id: context.customerId,
        folder_version: 2,
        updated_at: uploadedAt,
      }),
      writeManifest(workOrderFolderManifestPath({
        shopId: context.shopId,
        customerId: context.customerId,
        carId: context.carId,
        workOrderId: orderId,
      }), {
        construction_order_id: orderId,
        order_no: context.orderNo,
        customer_id: context.customerId,
        car_id: context.carId,
        folder_version: 2,
        updated_at: uploadedAt,
      }),
    ]).catch((manifestError) => console.error("work order photo manifest raw error", manifestError));

    return NextResponse.json({
      id: annotation.id,
      image_url: publicUrl,
      phase,
      storage_path: path,
      message: "施工照片已上傳，並依客戶與施工單完成雲端歸檔。",
    });
  } catch (error) {
    const result = apiError(error);
    console.error("work order photo upload raw error", error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}


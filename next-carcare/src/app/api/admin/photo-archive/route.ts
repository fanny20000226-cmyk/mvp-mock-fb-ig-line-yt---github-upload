import { NextResponse } from "next/server";
import { apiError, requireServerProfile } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CAR_IMAGE_BUCKET,
  customerWorkOrderPhotoPath,
  isCustomerWorkOrderPhotoPath,
  isVehiclePhotoPath,
  storagePathFromPublicUrl,
  vehicleFolderManifestPath,
  vehiclePhotoPath,
} from "@/lib/carPhotoStorage";
import { archiveQuotationPhotos, archiveWorkOrderPhotos } from "@/lib/photoArchiveServer";

type CarRow = {
  id: string;
  shop_id: string | null;
  customer_id?: string | null;
  plate_no: string | null;
  license_plate: string | null;
};

type WorkOrderRow = {
  id: string;
  shop_id?: string | null;
  store_id?: string | null;
  customer_id?: string | null;
  car_id?: string | null;
  quotation_id?: string | null;
  order_no?: string | null;
};

type AnnotationRow = {
  id: string;
  shop_id: string | null;
  image_url: string;
  annot_data: Record<string, unknown> | null;
};

type QuoteRow = {
  id: string;
  shop_id: string | null;
  car_id: string | null;
  plate_no: string | null;
};

function normalizePlate(value: unknown) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function fileNameFromPath(path: string) {
  return path.split("/").pop() || "photo.jpg";
}

async function copyPhoto(sourcePath: string, destinationPath: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(CAR_IMAGE_BUCKET).download(sourcePath);
  if (error || !data) throw error || new Error("讀取原始照片失敗。");
  const { error: uploadError } = await admin.storage.from(CAR_IMAGE_BUCKET).upload(destinationPath, data, {
    contentType: data.type || undefined,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  return admin.storage.from(CAR_IMAGE_BUCKET).getPublicUrl(destinationPath).data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, ["admin", "shop_manager"]);
    const body = (await request.json().catch(() => ({}))) as { action?: "scan" | "organize" };
    const dryRun = body.action !== "organize";
    const admin = getSupabaseAdmin();

    let shopIds = profile.shop_id ? [profile.shop_id] : [];
    if (profile.role === "admin" && profile.tenant_id) {
      const { data: shops, error: shopError } = await admin
        .from("shops")
        .select("id")
        .eq("tenant_id", profile.tenant_id);
      if (shopError) throw shopError;
      shopIds = (shops || []).map((shop) => String(shop.id));
    }
    if (!shopIds.length) throw new Error("帳號尚未綁定可管理的門市。");

    const [{ data: carData, error: carError }, { data: annotationData, error: annotationError }, { data: quoteData, error: quoteError }, { data: orderData, error: orderError }] = await Promise.all([
      admin.from("cars").select("*").in("shop_id", shopIds),
      admin.from("image_annotations").select("id,shop_id,image_url,annot_data").in("shop_id", shopIds),
      admin.from("quotations").select("id,shop_id,car_id,plate_no").in("shop_id", shopIds),
      admin.from("construction_orders").select("*").in("shop_id", shopIds),
    ]);
    if (carError) throw carError;
    if (annotationError) throw annotationError;
    if (quoteError) throw quoteError;
    if (orderError) throw orderError;

    const cars = (carData || []) as CarRow[];
    const annotations = (annotationData || []) as AnnotationRow[];
    const quotes = (quoteData || []) as QuoteRow[];
    const workOrders = (orderData || []) as WorkOrderRow[];
    const carsById = new Map(cars.map((car) => [car.id, car]));
    const workOrdersById = new Map(workOrders.map((order) => [order.id, order]));
    const workOrdersByCarId = new Map<string, WorkOrderRow[]>();
    for (const order of workOrders) {
      if (order.car_id) workOrdersByCarId.set(order.car_id, [...(workOrdersByCarId.get(order.car_id) || []), order]);
    }
    const carsByShopPlate = new Map<string, CarRow>();
    for (const car of cars) {
      const plate = normalizePlate(car.plate_no || car.license_plate);
      if (car.shop_id && plate) carsByShopPlate.set(`${car.shop_id}:${plate}`, car);
    }

    const report = {
      dry_run: dryRun,
      cars: cars.length,
      folders_created: 0,
      customer_folders_created: 0,
      work_order_folders_created: 0,
      annotation_photos_copied: 0,
      quotation_photos_copied: 0,
      work_order_photos_copied: 0,
      records_updated: 0,
      already_organized: 0,
      unmatched: 0,
      errors: [] as string[],
      originals_preserved: true,
    };

    for (const car of cars) {
      if (!car.shop_id) continue;
      if (!dryRun) {
        const path = vehicleFolderManifestPath(car.shop_id, car.id);
        const payload = new Blob([JSON.stringify({ car_id: car.id, folder_version: 1 })], { type: "application/json" });
        const { error } = await admin.storage.from(CAR_IMAGE_BUCKET).upload(path, payload, { upsert: true });
        if (error) report.errors.push(`車輛 ${car.id} 資料夾：${error.message}`);
      }
      report.folders_created += 1;
    }

    for (const annotation of annotations) {
      const plate = normalizePlate(annotation.annot_data?.plate_no);
      const annotationCarId = String(annotation.annot_data?.car_id || "");
      const car = (annotationCarId && carsById.get(annotationCarId)) ||
        (annotation.shop_id && plate ? carsByShopPlate.get(`${annotation.shop_id}:${plate}`) : undefined);
      if (!car?.shop_id) {
        report.unmatched += 1;
        continue;
      }
      const sourcePath = storagePathFromPublicUrl(annotation.image_url);
      if (!sourcePath) {
        report.unmatched += 1;
        continue;
      }
      const metadataOrderId = String(annotation.annot_data?.construction_order_id || "");
      const candidateOrders = workOrdersByCarId.get(car.id) || [];
      const order = (metadataOrderId && workOrdersById.get(metadataOrderId)) || (candidateOrders.length === 1 ? candidateOrders[0] : undefined);
      const customerId = order?.customer_id || car.customer_id || null;
      const orderContext = order && customerId ? {
        shopId: car.shop_id,
        customerId,
        carId: car.id,
        workOrderId: order.id,
      } : null;
      if (orderContext && isCustomerWorkOrderPhotoPath(sourcePath, orderContext)) {
        report.already_organized += 1;
        continue;
      }
      if (!orderContext && isVehiclePhotoPath(sourcePath, car.shop_id, car.id)) {
        report.already_organized += 1;
        continue;
      }
      const phase = String(annotation.annot_data?.phase || annotation.annot_data?.type || "").includes("after") ? "after" : "before";
      const destinationPath = orderContext ? customerWorkOrderPhotoPath({
        ...orderContext,
        phase,
        fileName: fileNameFromPath(sourcePath),
      }) : vehiclePhotoPath({
        shopId: car.shop_id,
        carId: car.id,
        category: "archive",
        recordId: annotation.id,
        fileName: fileNameFromPath(sourcePath),
      });
      try {
        if (!dryRun) {
          const publicUrl = await copyPhoto(sourcePath, destinationPath);
          const { error } = await admin
            .from("image_annotations")
            .update({
              image_url: publicUrl,
              annot_data: {
                ...(annotation.annot_data || {}),
                car_id: car.id,
                customer_id: customerId || annotation.annot_data?.customer_id || null,
                construction_order_id: order?.id || annotation.annot_data?.construction_order_id || null,
                order_no: order?.order_no || annotation.annot_data?.order_no || null,
                phase: orderContext ? phase : annotation.annot_data?.phase || null,
                type: orderContext ? `work_order_${phase}` : annotation.annot_data?.type || "car_archive",
                storage_path: destinationPath,
                original_storage_path: sourcePath,
                organized_at: new Date().toISOString(),
              },
            })
            .eq("id", annotation.id);
          if (error) throw error;
          report.records_updated += 1;
        }
        report.annotation_photos_copied += 1;
      } catch (error) {
        report.errors.push(`照片 ${annotation.id}：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const quote of quotes) {
      const car = (quote.car_id && carsById.get(quote.car_id)) ||
        (quote.shop_id && quote.plate_no ? carsByShopPlate.get(`${quote.shop_id}:${normalizePlate(quote.plate_no)}`) : undefined);
      if (!car?.shop_id) continue;
      try {
        const result = await archiveQuotationPhotos({
          admin,
          quotationId: quote.id,
          shopId: car.shop_id,
          carId: car.id,
          dryRun,
        });
        report.quotation_photos_copied += result.copied;
        report.already_organized += result.skipped;
        report.errors.push(...result.errors.map((message) => `報價 ${quote.id}：${message}`));
        if (!dryRun && result.copied > 0) report.records_updated += 1;
      } catch (error) {
        report.errors.push(`報價 ${quote.id}：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const order of workOrders) {
      const car = order.car_id ? carsById.get(order.car_id) : undefined;
      const shopId = order.shop_id || order.store_id || car?.shop_id || null;
      const customerId = order.customer_id || car?.customer_id || null;
      const carId = order.car_id || car?.id || null;
      if (!shopId || !customerId || !carId) {
        report.unmatched += 1;
        continue;
      }
      report.customer_folders_created += 1;
      report.work_order_folders_created += 1;
      try {
        const result = await archiveWorkOrderPhotos({
          admin,
          workOrderId: order.id,
          orderNo: order.order_no || order.id,
          quotationId: order.quotation_id,
          shopId,
          customerId,
          carId,
          dryRun,
        });
        report.work_order_photos_copied += result.copied;
        report.already_organized += result.skipped;
        report.records_updated += result.recordsUpdated;
        report.errors.push(...result.errors.map((message) => `施工單 ${order.order_no || order.id}：${message}`));
      } catch (error) {
        report.errors.push(`施工單 ${order.order_no || order.id}：${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return NextResponse.json({ ok: report.errors.length === 0, report });
  } catch (error) {
    const { status, message } = apiError(error);
    console.error("photo archive raw error", error);
    return NextResponse.json({ message }, { status });
  }
}

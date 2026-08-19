import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CAR_IMAGE_BUCKET,
  customerFolderManifestPath,
  customerWorkOrderPhotoPath,
  isCustomerWorkOrderPhotoPath,
  isVehiclePhotoPath,
  storagePathFromPublicUrl,
  vehiclePhotoPath,
  workOrderFolderManifestPath,
} from "@/lib/carPhotoStorage";

const imageUrlPattern = /https?:\/\/[^\s)]+/g;

function fileNameFromPath(path: string) {
  return path.split("/").pop() || "photo.jpg";
}

async function copyObject(admin: SupabaseClient, sourcePath: string, destinationPath: string) {
  const { data, error } = await admin.storage.from(CAR_IMAGE_BUCKET).download(sourcePath);
  if (error || !data) throw error || new Error("讀取原始照片失敗。");
  const { error: uploadError } = await admin.storage.from(CAR_IMAGE_BUCKET).upload(destinationPath, data, {
    contentType: data.type || undefined,
    upsert: true,
  });
  if (uploadError) throw uploadError;
  return admin.storage.from(CAR_IMAGE_BUCKET).getPublicUrl(destinationPath).data.publicUrl;
}

async function writeJson(admin: SupabaseClient, path: string, payload: Record<string, unknown>) {
  const data = new Blob([JSON.stringify(payload)], { type: "application/json" });
  const { error } = await admin.storage.from(CAR_IMAGE_BUCKET).upload(path, data, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

export async function archiveQuotationPhotos(input: {
  admin: SupabaseClient;
  quotationId: string;
  shopId: string;
  carId: string;
  dryRun?: boolean;
}) {
  const { admin, quotationId, shopId, carId, dryRun = false } = input;
  const { data: quote, error } = await admin
    .from("quotations")
    .select("id, remark")
    .eq("id", quotationId)
    .single();
  if (error || !quote) throw error || new Error("找不到報價單。");

  const remark = String(quote.remark || "");
  const urls = Array.from(new Set(remark.match(imageUrlPattern) || []));
  let nextRemark = remark;
  let copied = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const url of urls) {
    const sourcePath = storagePathFromPublicUrl(url);
    if (!sourcePath) {
      skipped += 1;
      continue;
    }
    if (isVehiclePhotoPath(sourcePath, shopId, carId)) {
      skipped += 1;
      continue;
    }
    const phase = remark.includes(`施工後照片：${url}`) ? "after" : "before";
    const destinationPath = vehiclePhotoPath({
      shopId,
      carId,
      category: "quotations",
      recordId: quotationId,
      phase,
      fileName: fileNameFromPath(sourcePath),
    });
    try {
      const publicUrl = dryRun ? url : await copyObject(admin, sourcePath, destinationPath);
      if (!dryRun) nextRemark = nextRemark.split(url).join(publicUrl);
      copied += 1;
    } catch (archiveError) {
      errors.push(archiveError instanceof Error ? archiveError.message : String(archiveError));
    }
  }

  if (!dryRun && nextRemark !== remark) {
    const { error: updateError } = await admin
      .from("quotations")
      .update({ remark: nextRemark, updated_at: new Date().toISOString() })
      .eq("id", quotationId);
    if (updateError) throw updateError;
  }

  return { copied, skipped, errors };
}

export async function archiveWorkOrderPhotos(input: {
  admin: SupabaseClient;
  workOrderId: string;
  orderNo: string;
  quotationId?: string | null;
  shopId: string;
  customerId: string;
  carId: string;
  dryRun?: boolean;
}) {
  const { admin, workOrderId, orderNo, quotationId, shopId, customerId, carId, dryRun = false } = input;
  const pathContext = { shopId, customerId, carId, workOrderId };
  let copied = 0;
  let skipped = 0;
  let recordsUpdated = 0;
  const errors: string[] = [];

  if (!dryRun) {
    const now = new Date().toISOString();
    await Promise.all([
      writeJson(admin, customerFolderManifestPath(shopId, customerId), {
        customer_id: customerId,
        folder_version: 2,
        updated_at: now,
      }),
      writeJson(admin, workOrderFolderManifestPath(pathContext), {
        construction_order_id: workOrderId,
        order_no: orderNo,
        customer_id: customerId,
        car_id: carId,
        folder_version: 2,
        updated_at: now,
      }),
    ]);
  }

  const { data: annotations, error: annotationError } = await admin
    .from("image_annotations")
    .select("id,image_url,annot_data")
    .eq("shop_id", shopId)
    .contains("annot_data", { construction_order_id: workOrderId });
  if (annotationError) throw annotationError;

  for (const annotation of annotations || []) {
    const sourcePath = storagePathFromPublicUrl(String(annotation.image_url || ""));
    if (!sourcePath) { skipped += 1; continue; }
    if (isCustomerWorkOrderPhotoPath(sourcePath, pathContext)) { skipped += 1; continue; }
    const metadata = (annotation.annot_data || {}) as Record<string, unknown>;
    const phase = String(metadata.phase || metadata.type || "").includes("after") ? "after" : "before";
    const destinationPath = customerWorkOrderPhotoPath({ ...pathContext, phase, fileName: fileNameFromPath(sourcePath) });
    try {
      const publicUrl = dryRun ? String(annotation.image_url) : await copyObject(admin, sourcePath, destinationPath);
      if (!dryRun) {
        const { error } = await admin.from("image_annotations").update({
          image_url: publicUrl,
          annot_data: {
            ...metadata,
            type: `work_order_${phase}`,
            phase,
            customer_id: customerId,
            car_id: carId,
            construction_order_id: workOrderId,
            order_no: orderNo,
            storage_path: destinationPath,
            original_storage_path: metadata.original_storage_path || sourcePath,
            organized_at: new Date().toISOString(),
          },
        }).eq("id", annotation.id);
        if (error) throw error;
        recordsUpdated += 1;
      }
      copied += 1;
    } catch (error) {
      errors.push(`標註照片 ${annotation.id}：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (quotationId) {
    const { data: quote, error } = await admin.from("quotations").select("id,remark").eq("id", quotationId).maybeSingle();
    if (error) throw error;
    const remark = String(quote?.remark || "");
    const urls = Array.from(new Set(remark.match(imageUrlPattern) || []));
    let nextRemark = remark;
    for (const url of urls) {
      const sourcePath = storagePathFromPublicUrl(url);
      if (!sourcePath) { skipped += 1; continue; }
      if (isCustomerWorkOrderPhotoPath(sourcePath, pathContext)) { skipped += 1; continue; }
      const phase = remark.includes(`施工後照片：${url}`) ? "after" : "before";
      const destinationPath = customerWorkOrderPhotoPath({ ...pathContext, phase, fileName: fileNameFromPath(sourcePath) });
      try {
        const publicUrl = dryRun ? url : await copyObject(admin, sourcePath, destinationPath);
        if (!dryRun) nextRemark = nextRemark.split(url).join(publicUrl);
        copied += 1;
      } catch (error) {
        errors.push(`報價照片：${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (!dryRun && quote && nextRemark !== remark) {
      const { error: updateError } = await admin.from("quotations").update({ remark: nextRemark, updated_at: new Date().toISOString() }).eq("id", quotationId);
      if (updateError) throw updateError;
      recordsUpdated += 1;
    }
  }

  return { copied, skipped, recordsUpdated, errors };
}

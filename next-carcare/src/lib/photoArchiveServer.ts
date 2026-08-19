import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CAR_IMAGE_BUCKET,
  isVehiclePhotoPath,
  storagePathFromPublicUrl,
  vehiclePhotoPath,
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

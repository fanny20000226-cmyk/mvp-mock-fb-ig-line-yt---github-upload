export const CAR_IMAGE_BUCKET = "car-images";

export function safeStorageSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

export function vehiclePhotoPath(input: {
  shopId: string;
  carId: string;
  category: "album" | "annotations" | "work-orders" | "quotations" | "archive";
  fileName: string;
  recordId?: string;
  phase?: "before" | "after";
}) {
  const parts = [
    safeStorageSegment(input.shopId),
    "vehicles",
    safeStorageSegment(input.carId),
    input.category,
  ];
  if (input.recordId) parts.push(safeStorageSegment(input.recordId));
  if (input.phase) parts.push(input.phase);
  parts.push(`${Date.now()}-${safeStorageSegment(input.fileName)}`);
  return parts.join("/");
}

export function vehicleFolderManifestPath(shopId: string, carId: string) {
  return `${safeStorageSegment(shopId)}/vehicles/${safeStorageSegment(carId)}/.vehicle.json`;
}

export function quotationStagingPath(input: {
  shopId: string;
  quoteNo: string;
  phase: "before" | "after";
  fileName: string;
}) {
  return [
    safeStorageSegment(input.shopId),
    "staging",
    "quotations",
    safeStorageSegment(input.quoteNo),
    input.phase,
    `${Date.now()}-${safeStorageSegment(input.fileName)}`,
  ].join("/");
}

export function storagePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${CAR_IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const encoded = url.slice(index + marker.length).split("?")[0];
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

export function isVehiclePhotoPath(path: string, shopId: string, carId: string) {
  return path.startsWith(`${safeStorageSegment(shopId)}/vehicles/${safeStorageSegment(carId)}/`);
}

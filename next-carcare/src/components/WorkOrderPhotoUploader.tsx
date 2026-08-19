"use client";

import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUiFeedback } from "@/components/UiFeedback";
import { supabase } from "@/lib/supabase";

export type WorkOrderPhotoGroups = { before: string[]; after: string[] };
type PhotoRow = { id: string; image_url: string; phase: "before" | "after"; created_at?: string | null };

async function authorizationHeader() {
  const { data } = await supabase.auth.getSession();
  return `Bearer ${data.session?.access_token || ""}`;
}

function toGroups(photos: PhotoRow[]): WorkOrderPhotoGroups {
  return photos.reduce<WorkOrderPhotoGroups>((groups, photo) => {
    if (photo.image_url) groups[photo.phase].push(photo.image_url);
    return groups;
  }, { before: [], after: [] });
}

async function preparePhoto(file: File) {
  if (file.size <= 2.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (blob) return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } catch (error) {
    console.warn("photo compression skipped", error);
  }
  if (file.size > 4 * 1024 * 1024) throw new Error(`${file.name} 超過雲端上傳限制，請改用較小的圖片。`);
  return file;
}

export default function WorkOrderPhotoUploader({
  orderId,
  compact = false,
  onChanged,
}: {
  orderId: string;
  compact?: boolean;
  onChanged?: (photos: WorkOrderPhotoGroups) => void;
}) {
  const { toast } = useUiFeedback();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const onChangedRef = useRef(onChanged);

  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/operations/work-order-photos?orderId=${encodeURIComponent(orderId)}`, {
      headers: { Authorization: await authorizationHeader() },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "讀取施工照片失敗。");
    const next = (body.photos || []) as PhotoRow[];
    setPhotos(next);
    onChangedRef.current?.(toGroups(next));
  }, [orderId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load().catch((error) => {
      if (active) toast(error instanceof Error ? error.message : "讀取施工照片失敗。", "error");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load, toast]);

  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    setUploading(true);
    let succeeded = 0;
    try {
      const authorization = await authorizationHeader();
      for (const file of Array.from(files)) {
        const uploadFile = await preparePhoto(file);
        const form = new FormData();
        form.set("orderId", orderId);
        form.set("phase", phase);
        form.set("file", uploadFile);
        const response = await fetch("/api/operations/work-order-photos", {
          method: "POST",
          headers: { Authorization: authorization },
          body: form,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || `${file.name} 上傳失敗。`);
        succeeded += 1;
      }
      await load();
      toast(`${succeeded} 張${phase === "before" ? "施工前" : "施工後"}照片已上傳並完成雲端分類。`, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "施工照片上傳失敗。", "error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const groups = toGroups(photos);
  return <section className={compact ? "space-y-3" : "mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-black">施工照片</h3>
        {!compact ? <p className="mt-1 text-sm text-neutral-500">照片會依客戶、車輛、施工單與施工前後自動存入雲端獨立資料夾。</p> : null}
      </div>
      <div className="flex min-h-11 rounded-xl border border-neutral-300 bg-white p-1" role="group" aria-label="照片階段">
        <button type="button" className={`min-h-10 rounded-lg px-4 font-bold ${phase === "before" ? "bg-neutral-950 text-white" : "text-neutral-700"}`} onClick={() => setPhase("before")}>施工前</button>
        <button type="button" className={`min-h-10 rounded-lg px-4 font-bold ${phase === "after" ? "bg-neutral-950 text-white" : "text-neutral-700"}`} onClick={() => setPhase("after")}>施工後</button>
      </div>
    </div>

    <label className={`${compact ? "field-camera-button w-full" : "primary-btn mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2"} ${uploading ? "pointer-events-none opacity-60" : ""}`}>
      {uploading ? <LoaderCircle className="animate-spin" /> : compact ? <Camera /> : <ImagePlus />}
      {uploading ? "正在上傳並歸檔…" : `拍攝／選擇${phase === "before" ? "施工前" : "施工後"}照片`}
      <input ref={fileInput} type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={uploading} onChange={(event) => upload(event.target.files)} />
    </label>

    {loading ? <p className="text-sm text-neutral-500">讀取雲端照片中…</p> : null}
    {!loading && photos.length === 0 ? <p className="rounded-xl border border-dashed border-neutral-300 p-3 text-sm text-neutral-500">這張施工單尚未上傳施工照片。</p> : null}
    {(["before", "after"] as const).map((photoPhase) => groups[photoPhase].length ? <div key={photoPhase} className="mt-3">
      <p className="mb-2 text-sm font-black text-neutral-700">{photoPhase === "before" ? "施工前" : "施工後"} · {groups[photoPhase].length} 張</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {groups[photoPhase].map((url, index) => <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="block min-h-11 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${photoPhase === "before" ? "施工前" : "施工後"}照片 ${index + 1}`} className="aspect-square h-full w-full object-cover" />
        </a>)}
      </div>
    </div> : null)}
  </section>;
}

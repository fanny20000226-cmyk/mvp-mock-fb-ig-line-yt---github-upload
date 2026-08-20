"use client";

import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUiFeedback } from "@/components/UiFeedback";
import { supabase } from "@/lib/supabase";

export type WorkOrderPhotoGroups = { before: string[]; after: string[] };
type PhotoRow = { id: string; image_url: string; phase: "before" | "after"; created_at?: string | null };
const PHOTO_BRANCHES = ["三重", "桃園", "新竹", "台南"] as const;
const PHOTO_BRANCH_STORAGE_KEY = "carcare-photo-branch";

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
  const [branchName, setBranchName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0 });
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const onChangedRef = useRef(onChanged);

  useEffect(() => { onChangedRef.current = onChanged; }, [onChanged]);
  useEffect(() => {
    const saved = window.localStorage.getItem(PHOTO_BRANCH_STORAGE_KEY) || "";
    if (PHOTO_BRANCHES.some((branch) => branch === saved)) setBranchName(saved);
  }, []);

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
    if (!files?.length || uploadLock.current) return;
    if (!branchName) {
      toast("請先選擇照片要歸檔的門市。", "warning");
      if (cameraInput.current) cameraInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
      return;
    }
    const selectedFiles = Array.from(files);
    uploadLock.current = true;
    setUploading(true);
    setUploadProgress({ completed: 0, total: selectedFiles.length });
    let succeeded = 0;
    const failures: string[] = [];
    try {
      const authorization = await authorizationHeader();
      let nextIndex = 0;
      const worker = async () => {
        while (nextIndex < selectedFiles.length) {
          const file = selectedFiles[nextIndex];
          nextIndex += 1;
          try {
            const uploadFile = await preparePhoto(file);
            const form = new FormData();
            form.set("orderId", orderId);
            form.set("phase", phase);
            form.set("branchName", branchName);
            form.set("file", uploadFile);
            const response = await fetch("/api/operations/work-order-photos", {
              method: "POST",
              headers: { Authorization: authorization },
              body: form,
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(body.message || `${file.name} 上傳失敗。`);
            succeeded += 1;
          } catch (error) {
            failures.push(`${file.name}：${error instanceof Error ? error.message : "上傳失敗"}`);
          } finally {
            setUploadProgress((current) => ({ ...current, completed: current.completed + 1 }));
          }
        }
      };
      const concurrency = Math.min(3, selectedFiles.length);
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
      await load();
      if (failures.length === 0) {
        toast(`${succeeded} 張${phase === "before" ? "施工前" : "施工後"}照片已上傳並完成雲端分類。`, "success");
      } else if (succeeded > 0) {
        toast(`已完成 ${succeeded} 張，另有 ${failures.length} 張失敗：${failures.slice(0, 2).join("；")}`, "warning");
      } else {
        toast(`全部照片上傳失敗：${failures.slice(0, 2).join("；")}`, "error");
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "施工照片上傳失敗。", "error");
    } finally {
      uploadLock.current = false;
      setUploading(false);
      setUploadProgress({ completed: 0, total: 0 });
      if (cameraInput.current) cameraInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  }

  const groups = toGroups(photos);
  return <section className={compact ? "space-y-3" : "mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-black">施工照片</h3>
        {!compact ? <p className="mt-1 text-sm text-neutral-500">照片會依客戶、車輛、施工單與施工前後自動存入雲端獨立資料夾。</p> : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-black text-neutral-600">
          照片歸檔門市
          <select
            value={branchName}
            onChange={(event) => {
              const nextBranch = event.target.value;
              setBranchName(nextBranch);
              if (nextBranch) window.localStorage.setItem(PHOTO_BRANCH_STORAGE_KEY, nextBranch);
            }}
            className="min-h-11 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-black text-neutral-900"
            aria-label="照片歸檔門市"
          >
            <option value="">請選門市</option>
            {PHOTO_BRANCHES.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </label>
        <div className="flex min-h-11 rounded-xl border border-neutral-300 bg-white p-1" role="group" aria-label="照片階段">
          <button type="button" className={`min-h-10 rounded-lg px-4 font-bold ${phase === "before" ? "bg-neutral-950 text-white" : "text-neutral-700"}`} onClick={() => setPhase("before")}>施工前</button>
          <button type="button" className={`min-h-10 rounded-lg px-4 font-bold ${phase === "after" ? "bg-neutral-950 text-white" : "text-neutral-700"}`} onClick={() => setPhase("after")}>施工後</button>
        </div>
      </div>
    </div>

    <div className={`${compact ? "grid grid-cols-2 gap-2" : "mt-3 flex flex-wrap gap-2"}`}>
      <label className={`${compact ? "field-camera-button w-full" : "primary-btn inline-flex min-h-11 cursor-pointer items-center gap-2"} ${uploading ? "pointer-events-none opacity-60" : ""}`}>
        {uploading ? <LoaderCircle className="animate-spin" /> : <Camera />}
        {uploading ? `${uploadProgress.completed}/${uploadProgress.total} 張處理中` : "拍照"}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading} onChange={(event) => upload(event.target.files)} />
      </label>
      <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-400 bg-white px-3 text-center text-sm font-black text-neutral-900 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
        {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
        {uploading ? "請稍候" : "從相簿多選"}
        <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(event) => upload(event.target.files)} />
      </label>
    </div>
    {!uploading ? <p className="mt-2 text-xs font-medium text-neutral-500">可一次選取多張照片，系統同時處理最多 3 張並分別同步到雲端。</p> : null}

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


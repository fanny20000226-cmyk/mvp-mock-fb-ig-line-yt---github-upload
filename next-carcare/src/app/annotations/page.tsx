"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import ImageAnnotator, { type AnnotationMark } from "@/components/ImageAnnotator";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";

export default function AnnotationsPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [boxes, setBoxes] = useState<AnnotationMark[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const image = searchParams.get("image");
    const plate = searchParams.get("plate");
    if (image) setImageUrl(image);
    if (plate) setPlateNo(plate);
  }, []);

  async function uploadImage(file: File) {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請先確認帳號綁定門店。");
    setUploading(true);
    const path = `${profile.shop_id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, {
      upsert: false
    });
    if (error) {
      setUploading(false);
      return alert(`${error.message}\n\n如果看到 Bucket not found，請先建立 car-images 儲存桶。`);
    }
    const { data } = supabase.storage.from("car-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  async function save() {
    setSaving(true);
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) {
      alert("找不到門店資料，請先確認帳號已綁定 shop_id。");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("image_annotations").insert({
      shop_id: profile.shop_id,
      image_url: imageUrl,
      annot_data: {
        type: "annotated",
        plate_no: plateNo.trim(),
        boxes,
        total_price: boxes.reduce((sum, box) => sum + box.price, 0)
      },
      created_by: profile.id
    });
    setSaving(false);
    if (error) return alert(error.message);
    alert("標註已儲存。");
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-4">
          <p className="text-sm font-black text-carcare-yellow">車況照片 / 施工範圍</p>
          <h1 className="text-2xl font-black">車況圖片標註</h1>
          <p className="mt-1 text-sm text-neutral-500">
            上傳照片後，用滑鼠或手指在圖片上框選施工區域，系統會記錄座標與金額。
          </p>
        </div>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="也可以直接貼上圖片網址"
          />
          <button onClick={save} disabled={!imageUrl || saving} className="primary-btn">
            {saving ? "儲存中..." : "儲存標註"}
          </button>
        </div>
        <input
          className="form-input mb-4"
          value={plateNo}
          onChange={(event) => setPlateNo(event.target.value)}
          placeholder="車牌號碼，填寫後會歸到該車雲端相簿"
        />
        <label className="mb-4 block rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-center font-black">
          {uploading ? "圖片上傳中..." : "上傳車況照片"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file);
            }}
          />
        </label>
        {imageUrl ? (
          <ImageAnnotator imageUrl={imageUrl} onChange={setBoxes} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-neutral-500">
            請上傳照片或貼上圖片網址，接著就能圈選髒污、破損或施工範圍。
          </p>
        )}
      </section>
    </RequireAuth>
  );
}

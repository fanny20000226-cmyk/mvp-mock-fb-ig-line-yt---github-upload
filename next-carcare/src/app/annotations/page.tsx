"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import ImageAnnotator, { type AnnotationBox } from "@/components/ImageAnnotator";
import { supabase } from "@/lib/supabase";
import { getCurrentProfile } from "@/lib/auth";

export default function AnnotationsPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [boxes, setBoxes] = useState<AnnotationBox[]>([]);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) {
      alert("找不到門店資料，請確認使用者已綁定 shop_id");
      setSaving(false);
      return;
    }
    await supabase.from("image_annotations").insert({
      shop_id: profile.shop_id,
      image_url: imageUrl,
      annot_data: {
        boxes,
        total_price: boxes.reduce((sum, box) => sum + box.price, 0)
      },
      created_by: profile.id
    });
    setSaving(false);
    alert("標註已儲存");
  }

  return (
    <RequireAuth>
      <section className="card">
        <h1 className="mb-4 text-2xl font-black">車內圖片標註</h1>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="form-input"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="貼上 Supabase Storage 圖片網址"
          />
          <button onClick={save} disabled={!imageUrl || saving} className="primary-btn">
            {saving ? "儲存中..." : "儲存標註"}
          </button>
        </div>
        {imageUrl ? (
          <ImageAnnotator imageUrl={imageUrl} onChange={setBoxes} />
        ) : (
          <p className="rounded-xl border border-dashed p-8 text-neutral-500">
            請先貼上圖片網址，再用滑鼠或手指框選施工區域。
          </p>
        )}
      </section>
    </RequireAuth>
  );
}

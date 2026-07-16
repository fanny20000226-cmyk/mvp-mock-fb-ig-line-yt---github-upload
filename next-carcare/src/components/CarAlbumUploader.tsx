"use client";

import { useState } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type CarOption = {
  id: string;
  customer_name: string;
  plate_no: string | null;
};

export default function CarAlbumUploader({ cars }: { cars: CarOption[] }) {
  const [carId, setCarId] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lastUrl, setLastUrl] = useState("");

  async function upload(file: File) {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請重新登入。");
    if (!carId) return alert("請先選擇要歸檔的車輛。");

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const path = `${profile.shop_id}/album/${carId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, {
      upsert: false
    });
    if (error) {
      setUploading(false);
      return alert(`${error.message}\n\n如果顯示 Bucket not found，請先在 Supabase 建立 car-images 儲存桶。`);
    }

    const { data } = supabase.storage.from("car-images").getPublicUrl(path);
    const publicUrl = data.publicUrl;
    const { error: insertError } = await supabase.from("image_annotations").insert({
      shop_id: profile.shop_id,
      car_id: carId,
      image_url: publicUrl,
      annot_data: {
        type: "car_album",
        caption,
        uploaded_at: new Date().toISOString()
      },
      created_by: profile.id
    });

    setUploading(false);
    if (insertError) return alert(insertError.message);
    setCaption("");
    setLastUrl(publicUrl);
    alert("照片已上傳並歸檔。");
  }

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4">
        <p className="text-sm font-black text-carcare-yellow">車輛相簿</p>
        <h2 className="text-xl font-black">上傳車況照片</h2>
        <p className="mt-1 text-sm text-neutral-500">
          照片會存到 Supabase Storage，並用 image_annotations 表保留車輛歸檔資訊。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <select className="form-input" value={carId} onChange={(e) => setCarId(e.target.value)}>
          <option value="">選擇車輛</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.customer_name} / {car.plate_no || "未填車牌"}
            </option>
          ))}
        </select>
        <input
          className="form-input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="照片備註，例如施工前、施工後"
        />
        <label className="primary-btn cursor-pointer text-center">
          {uploading ? "上傳中..." : "選照片上傳"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
      </div>
      {lastUrl ? (
        <div className="mt-4 rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lastUrl} alt="最新上傳照片" className="max-h-80 rounded-xl object-contain" />
        </div>
      ) : null}
    </section>
  );
}

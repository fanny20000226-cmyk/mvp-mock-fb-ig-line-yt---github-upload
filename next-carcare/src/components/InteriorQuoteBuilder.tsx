"use client";

import { useMemo, useState } from "react";
import { exportElementToPdf } from "@/lib/pdf";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type QuoteOption = {
  id: string;
  label: string;
  price: number;
};

export type QuoteDraft = {
  customer_name: string;
  customer_phone: string;
  plate_no: string;
  custom_item: string;
  final_amount: string;
  note: string;
  items?: QuoteOption[];
};

const carTypes = ["一般5人座轎車", "七人座2-3-2", "九人商務車"];
const stores = ["三重門市", "桃園門市", "新竹門市", "台南門市"];
const categories = ["基礎保養", "加購", "贈送", "外包", "其他備註"];

const carPreview: Record<string, string> = {
  一般5人座轎車: "/car-diagram/car-preview-5seat.png",
  "七人座2-3-2": "/car-diagram/car-preview-7seat.png",
  九人商務車: "/car-diagram/car-preview-9seat.png"
};

const carpetImage: Record<string, string> = {
  一般5人座轎車: "/car-diagram/carpet-area-mark-5seat.png",
  "七人座2-3-2": "/car-diagram/carpet-area-mark-7seat.png",
  九人商務車: "/car-diagram/carpet-area-mark-9seat.png"
};

const carpetOptions: QuoteOption[] = [
  { id: "driver-carpet", label: "駕駛座地毯", price: 600 },
  { id: "passenger-carpet", label: "副駕地毯", price: 600 },
  { id: "left-carpet", label: "左半邊地毯", price: 600 },
  { id: "right-carpet", label: "右半邊地毯", price: 600 },
  { id: "all-carpet", label: "全車地毯", price: 2200 }
];

const seatOptions: QuoteOption[] = [
  { id: "driver-seat", label: "駕駛座椅", price: 800 },
  { id: "passenger-seat", label: "副駕駛座椅", price: 800 },
  { id: "rear-seat", label: "後座座椅", price: 1200 },
  { id: "rear-combo-seat", label: "後排連體座椅", price: 1600 }
];

const extraOptions: QuoteOption[] = [
  { id: "odor", label: "煙味 / 異味處理", price: 1500 },
  { id: "pet-hair", label: "寵物毛髮處理", price: 1200 },
  { id: "white-interior", label: "白內裝重點處理", price: 2800 }
];

function formatMoney(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function parseAmount(value: string) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0;
}

function selectedOptions(options: QuoteOption[], selected: string[]) {
  return options.filter((item) => selected.includes(item.id));
}

function optionTotal(options: QuoteOption[], selected: string[]) {
  return selectedOptions(options, selected).reduce((sum, item) => sum + item.price, 0);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function InteriorQuoteBuilder({
  onGenerate,
  compact = false
}: {
  onGenerate: (draft: QuoteDraft) => Promise<void> | void;
  compact?: boolean;
}) {
  const [carType, setCarType] = useState(carTypes[0]);
  const [store, setStore] = useState(stores[1]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [categoryA, setCategoryA] = useState(categories[0]);
  const [categoryB, setCategoryB] = useState(categories[1]);
  const [noteA, setNoteA] = useState("");
  const [noteB, setNoteB] = useState("");
  const [carpets, setCarpets] = useState<string[]>([]);
  const [seats, setSeats] = useState<string[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [deposit, setDeposit] = useState("");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [photoPhase, setPhotoPhase] = useState<"before" | "after">("before");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoteNo] = useState(() => `Q${Date.now()}`);

  const carpetSubtotal = useMemo(() => optionTotal(carpetOptions, carpets), [carpets]);
  const seatSubtotal = useMemo(() => optionTotal(seatOptions, seats), [seats]);
  const extraSubtotal = useMemo(() => optionTotal(extraOptions, extras), [extras]);
  const depositAmount = parseAmount(deposit);
  const totalAmount = Math.max(carpetSubtotal + seatSubtotal + extraSubtotal - depositAmount, 0);
  const allItems = useMemo(
    () => [
      ...selectedOptions(carpetOptions, carpets),
      ...selectedOptions(seatOptions, seats),
      ...selectedOptions(extraOptions, extras)
    ],
    [carpets, seats, extras]
  );

  function toggleList(current: string[], id: string, setter: (next: string[]) => void) {
    if (id === "all-carpet") {
      setter(current.includes(id) ? [] : [id]);
      return;
    }
    setter(current.includes(id) ? current.filter((item) => item !== id) : [...current.filter((item) => item !== "all-carpet"), id]);
  }

  async function uploadPhoto(file: File) {
    const current = photoPhase === "before" ? beforePhotos : afterPhotos;
    if (current.length >= 8) return alert("每個分類最多上傳 8 張照片。");
    setUploading(true);
    try {
      const profile = await getCurrentProfile();
      let imageUrl = "";
      if (profile?.shop_id) {
        const safeName = file.name.replace(/[^\w.-]+/g, "-");
        const path = `${profile.shop_id}/mobile-order/${plateNo || "no-plate"}/${photoPhase}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("car-images").upload(path, file, { upsert: false });
        if (!error) {
          const { data } = supabase.storage.from("car-images").getPublicUrl(path);
          imageUrl = data.publicUrl;
          await supabase.from("image_annotations").insert({
            shop_id: profile.shop_id,
            image_url: imageUrl,
            annot_data: {
              type: photoPhase === "before" ? "quick_before_photo" : "quick_after_photo",
              plate_no: plateNo,
              car_type: carType,
              uploaded_at: new Date().toISOString()
            },
            created_by: profile.id
          });
        }
      }
      if (!imageUrl) imageUrl = await fileToDataUrl(file);
      if (photoPhase === "before") {
        setBeforePhotos((currentPhotos) => [...currentPhotos, imageUrl]);
      } else {
        setAfterPhotos((currentPhotos) => [...currentPhotos, imageUrl]);
      }
    } catch (error) {
      console.error(error);
      alert("照片上傳失敗，已保留頁面操作，請稍後再試。");
    } finally {
      setUploading(false);
    }
  }

  async function generate(exportPdf = false) {
    if (saving) return;
    if (!customerName || !customerPhone || !plateNo || !carType) {
      alert("請先填寫姓名、電話、車牌與車型。");
      return;
    }
    if (!allItems.length) {
      alert("請至少選擇一個施工項目。");
      return;
    }
    setSaving(true);
    try {
      await onGenerate({
        customer_name: customerName,
        customer_phone: customerPhone,
        plate_no: plateNo,
        custom_item: `行動快速開單 / ${carType}`,
        final_amount: String(totalAmount),
        note: [
          `報價單號：${quoteNo}`,
          `門市：${store}`,
          `車型：${carType}`,
          `分類A：${categoryA} / ${noteA || "-"}`,
          `分類B：${categoryB} / ${noteB || "-"}`,
          `施工前照片：${beforePhotos.join("、") || "-"}`,
          `施工後照片：${afterPhotos.join("、") || "-"}`,
          `地毯小計：${formatMoney(carpetSubtotal)}`,
          `座椅小計：${formatMoney(seatSubtotal)}`,
          `附加小計：${formatMoney(extraSubtotal)}`,
          `訂金：${formatMoney(depositAmount)}`,
          `總金額：${formatMoney(totalAmount)}`
        ].join("\n"),
        items: allItems
      });
      if (exportPdf) {
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        await exportElementToPdf("quick-order-pdf", `PEIWAY_${plateNo || quoteNo}_報價單.pdf`);
      }
    } finally {
      setSaving(false);
    }
  }

  function PhotoGrid({ urls }: { urls: string[] }) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="施工照片" className="h-20 w-full rounded-xl object-cover" />
          ) : (
            <label key={index} className="flex h-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-2xl font-black text-neutral-400">
              +
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadPhoto(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">PEIWAY 現場開單</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
            <p className="text-sm text-neutral-500">手機現場快速建立報價，資料會同步到正式報價紀錄。</p>
          </div>
          <select className="form-input max-w-xs" value={store} onChange={(e) => setStore(e.target.value)}>
            {stores.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>

      <section className={`grid gap-5 ${compact ? "" : "xl:grid-cols-3"}`}>
        <div className="card space-y-3">
          <h2 className="text-lg font-black">客戶與車輛資訊</h2>
          <select className="form-input" value={carType} onChange={(e) => setCarType(e.target.value)}>
            {carTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input className="form-input" placeholder="車主姓名" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="form-input" placeholder="聯絡電話" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <input className="form-input" placeholder="車牌號碼" value={plateNo} onChange={(e) => setPlateNo(e.target.value.toUpperCase())} />
          <div className="rounded-xl bg-neutral-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={carPreview[carType] || carPreview[carTypes[0]]} alt={carType} loading="lazy" className="mx-auto max-h-48 w-full object-contain" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-black">施工分類與地毯</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="form-input" value={categoryA} onChange={(e) => setCategoryA(e.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="form-input" value={categoryB} onChange={(e) => setCategoryB(e.target.value)}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <textarea className="form-input" placeholder="左備註" value={noteA} onChange={(e) => setNoteA(e.target.value)} />
          <textarea className="form-input" placeholder="右備註" value={noteB} onChange={(e) => setNoteB(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            {carpetOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleList(carpets, item.id, setCarpets)}
                className={carpets.includes(item.id) ? "primary-btn" : "secondary-btn"}
              >
                {item.label}
                <span className="ml-1 text-xs">{formatMoney(item.price)}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={carpetImage[carType] || carpetImage[carTypes[0]]} alt="地毯示意圖" loading="lazy" className="mx-auto max-h-56 w-full object-contain" />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-black">座椅與附加項目</h2>
          <div className="grid grid-cols-2 gap-2">
            {seatOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleList(seats, item.id, setSeats)}
                className={seats.includes(item.id) ? "primary-btn" : "secondary-btn"}
              >
                {item.label}
                <span className="ml-1 text-xs">{formatMoney(item.price)}</span>
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-neutral-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/car-diagram/seat-diagram.png" alt="座椅示意圖" loading="lazy" className="mx-auto max-h-56 w-full object-contain" />
          </div>
          <div className="grid gap-2">
            {extraOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleList(extras, item.id, setExtras)}
                className={extras.includes(item.id) ? "primary-btn" : "secondary-btn"}
              >
                {item.label}
                <span className="ml-1 text-xs">{formatMoney(item.price)}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={photoPhase === "before" ? "primary-btn" : "secondary-btn"} onClick={() => setPhotoPhase("before")}>施工前照片</button>
          <button type="button" className={photoPhase === "after" ? "primary-btn" : "secondary-btn"} onClick={() => setPhotoPhase("after")}>施工後照片</button>
          {uploading ? <span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-black">上傳中...</span> : null}
        </div>
        <PhotoGrid urls={photoPhase === "before" ? beforePhotos : afterPhotos} />
      </section>

      <section className="rounded-xl bg-carcare-black p-5 text-white shadow-soft">
        <div className="grid gap-4 sm:grid-cols-4">
          <div><p className="text-white/60">地毯小計</p><p className="text-2xl font-black text-carcare-yellow">{formatMoney(carpetSubtotal)}</p></div>
          <div><p className="text-white/60">座椅小計</p><p className="text-2xl font-black text-carcare-yellow">{formatMoney(seatSubtotal)}</p></div>
          <div><p className="text-white/60">附加項目</p><p className="text-2xl font-black text-carcare-yellow">{formatMoney(extraSubtotal)}</p></div>
          <div>
            <p className="text-white/60">訂金</p>
            <input className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white" inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-carcare-yellow/50 bg-white/5 p-4">
          <p className="text-white/60">最終應付金額</p>
          <p className="text-5xl font-black text-carcare-yellow">{formatMoney(totalAmount)}</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button className="primary-btn text-lg" type="button" disabled={saving} onClick={() => generate(false)}>
            {saving ? "儲存中..." : "儲存單據"}
          </button>
          <button className="primary-btn text-lg" type="button" disabled={saving} onClick={() => generate(true)}>
            {saving ? "匯出中..." : "儲存並匯出報價單 PDF"}
          </button>
        </div>
      </section>

      <section className="fixed left-[-9999px] top-0 w-[794px] bg-white p-8 text-neutral-950">
        <div id="quick-order-pdf" className="space-y-5 bg-white p-6">
          <div className="flex items-center justify-between bg-carcare-black p-5 text-white">
            <div className="text-4xl font-black italic">PEI<span className="text-carcare-yellow">WAY</span></div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-white">汽車施工專業報價單</h2>
              <p className="text-sm text-white/70">{quoteNo}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-lg font-black">客戶車輛資訊</h3>
              <p>車主：{customerName}</p>
              <p>電話：{customerPhone}</p>
              <p>車牌：{plateNo}</p>
              <p>車型：{carType}</p>
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-lg font-black">施工項目</h3>
              {allItems.map((item) => <p key={item.id}>{item.label} {formatMoney(item.price)}</p>)}
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="mb-2 text-lg font-black">備註</h3>
            <p className="whitespace-pre-wrap">{[noteA, noteB].filter(Boolean).join("\n") || "-"}</p>
          </div>
          <div className="rounded-xl bg-carcare-yellow p-5 text-center text-4xl font-black">
            總金額 {formatMoney(totalAmount)}
          </div>
        </div>
      </section>
    </div>
  );
}

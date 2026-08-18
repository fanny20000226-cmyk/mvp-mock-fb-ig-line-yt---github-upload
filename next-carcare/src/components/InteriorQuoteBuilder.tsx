"use client";

import { useMemo, useRef, useState } from "react";
import { exportElementToPdf } from "@/lib/pdf";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useUiFeedback } from "@/components/UiFeedback";
import { useUnsavedChanges } from "@/components/UiPatterns";

export type QuoteOption = {
  id: string;
  label: string;
  price: number;
};

export type QuoteDraft = {
  customer_name: string;
  customer_phone: string;
  plate_no: string;
  brand?: string;
  car_type?: string;
  custom_item: string;
  final_amount: string;
  note: string;
  items?: QuoteOption[];
};

const carTypes = ["一般5人座轎車", "七人座 2-3-2", "九人座商務車"];
const stores = ["三重門市", "桃園門市", "新竹門市", "台南門市"];
const categories = ["基礎保養", "加購", "贈送", "外包", "其他備註"];

const carPreview: Record<string, string> = {
  "一般5人座轎車": "/car-diagram/car-preview-5seat.png",
  "七人座 2-3-2": "/car-diagram/car-preview-7seat.png",
  "九人座商務車": "/car-diagram/car-preview-9seat.png",
};

const carpetImage: Record<string, string> = {
  "一般5人座轎車": "/car-diagram/carpet-area-mark-5seat.png",
  "七人座 2-3-2": "/car-diagram/carpet-area-mark-7seat.png",
  "九人座商務車": "/car-diagram/carpet-area-mark-9seat.png",
};

const carpetOptions: QuoteOption[] = [
  { id: "driver-carpet", label: "駕駛座地毯", price: 600 },
  { id: "passenger-carpet", label: "副駕地毯", price: 600 },
  { id: "left-carpet", label: "左半邊地毯", price: 600 },
  { id: "right-carpet", label: "右半邊地毯", price: 600 },
  { id: "all-carpet", label: "全車地毯", price: 2200 },
];

const seatOptions: QuoteOption[] = [
  { id: "driver-seat", label: "駕駛座椅", price: 800 },
  { id: "passenger-seat", label: "副駕駛座椅", price: 800 },
  { id: "rear-seat", label: "後座座椅", price: 1200 },
  { id: "rear-combo-seat", label: "後排連體座椅", price: 1600 },
];

const extraOptions: QuoteOption[] = [
  { id: "odor-addon", label: "煙味 / 異味處理", price: 1500 },
  { id: "pet-hair-addon", label: "寵物毛髮處理", price: 1200 },
  { id: "white-interior-addon", label: "白內裝重點處理", price: 2800 },
];

function formatMoney(amount: number) {
  return `$${Math.round(amount).toLocaleString()}`;
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "") || 0);
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

function toggleList(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function optionButtonClass(active: boolean) {
  return active ? "primary-btn justify-center" : "secondary-btn justify-center";
}

export default function InteriorQuoteBuilder({
  onGenerate,
  compact = false,
}: {
  onGenerate: (draft: QuoteDraft) => Promise<void> | void;
  compact?: boolean;
}) {
  const { toast } = useUiFeedback();
  const [carType, setCarType] = useState(carTypes[0]);
  const [store, setStore] = useState(stores[1]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [brand, setBrand] = useState("");
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
      ...selectedOptions(extraOptions, extras),
    ],
    [carpets, extras, seats]
  );
  const formSignature = JSON.stringify({ carType, store, customerName, customerPhone, plateNo, brand, categoryA, categoryB, noteA, noteB, carpets, seats, extras, deposit, beforePhotos, afterPhotos });
  const savedSignature = useRef(formSignature);
  useUnsavedChanges(formSignature !== savedSignature.current && !saving);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;

    setUploading(true);
    try {
      const profile = await getCurrentProfile();
      const nextUrls: string[] = [];

      for (const file of Array.from(files).slice(0, 8)) {
        const extension = file.name.split(".").pop() || "jpg";
        const safePlate = plateNo.trim() || "no-plate";
        const path = `${profile?.shop_id || "public"}/${safePlate}/${photoPhase}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${extension}`;

        const { error } = await supabase.storage.from("car-images").upload(path, file, { upsert: true });
        if (error) {
          nextUrls.push(await fileToDataUrl(file));
          continue;
        }

        const { data } = supabase.storage.from("car-images").getPublicUrl(path);
        nextUrls.push(data.publicUrl);
      }

      if (photoPhase === "before") setBeforePhotos((current) => [...current, ...nextUrls].slice(0, 8));
      else setAfterPhotos((current) => [...current, ...nextUrls].slice(0, 8));
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(phase: "before" | "after", url: string) {
    if (phase === "before") setBeforePhotos((current) => current.filter((item) => item !== url));
    else setAfterPhotos((current) => current.filter((item) => item !== url));
  }

  function buildNote() {
    const beforeList = beforePhotos.map((url) => `施工前照片：${url}`).join("\n");
    const afterList = afterPhotos.map((url) => `施工後照片：${url}`).join("\n");
    const itemList = allItems.map((item) => `- ${item.label} ${formatMoney(item.price)}`).join("\n");
    return [
      `門市：${store}`,
      `車型：${carType}`,
      brand ? `車廠品牌：${brand}` : "",
      `${categoryA}：${noteA || "無"}`,
      `${categoryB}：${noteB || "無"}`,
      itemList ? `施工項目：\n${itemList}` : "",
      `地毯小計：${formatMoney(carpetSubtotal)}`,
      `座椅小計：${formatMoney(seatSubtotal)}`,
      `加購小計：${formatMoney(extraSubtotal)}`,
      `訂金：${formatMoney(depositAmount)}`,
      beforeList,
      afterList,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function saveQuote(exportPdf: boolean) {
    if (saving) return;
    if (!customerName.trim()) { document.getElementById("quote-customer-name")?.scrollIntoView({ behavior: "smooth", block: "center" }); return toast("請填寫車主姓名。", "error"); }
    if (!plateNo.trim()) { document.getElementById("quote-plate-no")?.scrollIntoView({ behavior: "smooth", block: "center" }); return toast("請填寫車牌號碼。", "error"); }

    setSaving(true);
    try {
      await onGenerate({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        plate_no: plateNo.trim(),
        brand: brand.trim(),
        car_type: carType,
        custom_item: `打翻評估 / ${carType}`,
        final_amount: String(totalAmount),
        note: buildNote(),
        items: allItems,
      });
      savedSignature.current = formSignature;
      toast("報價單已儲存。", "success");

      if (exportPdf) {
        await exportElementToPdf("interior-quote-preview", `PEIWAY_${plateNo || quoteNo}_報價單.pdf`);
      }
    } finally {
      setSaving(false);
    }
  }

  const activePhotos = photoPhase === "before" ? beforePhotos : afterPhotos;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="form-section">
          <h2 className="mb-4 text-xl font-black">車型與車輛資料</h2>
          <div className="space-y-3">
            <label><span className="field-label required">車型</span><select className="form-input" value={carType} onChange={(event) => setCarType(event.target.value)}>
              {carTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select></label>
            <label><span className="field-label required">車主姓名</span><input id="quote-customer-name" className="form-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="例：王小明" /></label>
            <label><span className="field-label">聯絡電話</span><input className="form-input" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value.replace(/[^\d-]/g, "").replace(/^(\d{4})(\d)/, "$1-$2").slice(0, 12))} placeholder="0912-345-678" inputMode="tel" /></label>
            <label><span className="field-label required">車牌號碼</span><input id="quote-plate-no" className="form-input uppercase" value={plateNo} onChange={(event) => setPlateNo(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} placeholder="ABC-1234" autoCapitalize="characters" /></label>
            <label><span className="field-label">車廠品牌</span><input className="form-input" value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="可留空" /></label>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <img src={carPreview[carType]} alt={carType} loading="lazy" className="mx-auto max-h-48 w-full object-contain" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="mb-4 text-xl font-black">施作分類左備註</h2>
          <label><span className="field-label">施作分類</span><select className="form-input" value={categoryA} onChange={(event) => setCategoryA(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select></label>
          <label className="mt-3 block"><span className="field-label">施作備註</span><textarea className="form-input min-h-32" value={noteA} onChange={(event) => setNoteA(event.target.value)} placeholder="左排或第一組施作備註" /></label>
        </div>

        <div className="form-section">
          <h2 className="mb-4 text-xl font-black">施作分類右備註</h2>
          <label><span className="field-label">施作分類</span><select className="form-input" value={categoryB} onChange={(event) => setCategoryB(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select></label>
          <label className="mt-3 block"><span className="field-label">施作備註</span><textarea className="form-input min-h-32" value={noteB} onChange={(event) => setNoteB(event.target.value)} placeholder="右排或第二組施作備註" /></label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card">
          <h2 className="mb-4 text-xl font-black">地毯選項</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {carpetOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={optionButtonClass(carpets.includes(item.id))}
                onClick={() => setCarpets((current) => toggleList(current, item.id))}
              >
                {item.label} {formatMoney(item.price)}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <img src={carpetImage[carType]} alt={`${carType}地毯示意圖`} loading="lazy" className="mx-auto max-h-72 w-full object-contain" />
          </div>
          <p className="mt-3 text-sm font-bold">地毯小計：<span className="text-carcare-yellow">{formatMoney(carpetSubtotal)}</span></p>
        </div>

        <div className="card">
          <h2 className="mb-4 text-xl font-black">座椅選項</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {seatOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                className={optionButtonClass(seats.includes(item.id))}
                onClick={() => setSeats((current) => toggleList(current, item.id))}
              >
                {item.label} {formatMoney(item.price)}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
            <img src="/car-diagram/seat-diagram.png" alt="座椅分區示意圖" loading="lazy" className="mx-auto max-h-72 w-full object-contain" />
          </div>
          <p className="mt-3 text-sm font-bold">座椅小計：<span className="text-carcare-yellow">{formatMoney(seatSubtotal)}</span></p>
        </div>

        <div className="card">
          <h2 className="mb-4 text-xl font-black">建議方案與照片</h2>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button type="button" className={optionButtonClass(photoPhase === "before")} onClick={() => setPhotoPhase("before")}>施工前照片</button>
            <button type="button" className={optionButtonClass(photoPhase === "after")} onClick={() => setPhotoPhase("after")}>施工後照片</button>
          </div>
          <label htmlFor="quote-photo-input" className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-sm font-black text-neutral-500">
            {uploading ? "上傳中..." : "點擊上傳照片"}
            <input id="quote-photo-input" type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadFiles(event.target.files)} />
          </label>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {activePhotos.map((url) => (
              <button key={url} type="button" className="relative overflow-hidden rounded-xl border border-neutral-200" onClick={() => window.open(url, "_blank")}>
                <img src={url} alt="車況照片" className="aspect-square w-full object-cover" loading="lazy" />
                <span
                  className="absolute right-1 top-1 rounded bg-black/70 px-1 text-xs text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    removePhoto(photoPhase, url);
                  }}
                >
                  刪除
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {extraOptions.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="font-bold">{item.label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">{formatMoney(item.price)}</span>
                  <input type="checkbox" checked={extras.includes(item.id)} onChange={() => setExtras((current) => toggleList(current, item.id))} />
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <section id="interior-quote-preview" className="card overflow-hidden p-0">
        <div className="bg-carcare-black p-5 text-white">
          <p className="text-sm text-carcare-yellow">PEIWAY 報價預覽</p>
          <h2 className="text-2xl font-black">打翻評估報價單</h2>
          <p className="text-sm text-neutral-300">{quoteNo} / {store} / {carType}</p>
        </div>
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <div>
            <h3 className="font-black">客戶車輛資訊</h3>
            <p>車主：{customerName || "-"}</p>
            <p>電話：{customerPhone || "-"}</p>
            <p>車牌：{plateNo || "-"}</p>
            <p>車型：{carType}</p>
          </div>
          <div>
            <h3 className="font-black">施工項目</h3>
            {allItems.length ? (
              <ul className="mt-2 space-y-1">
                {allItems.map((item) => (
                  <li key={item.id} className="flex justify-between border-b border-neutral-100 py-1">
                    <span>{item.label}</span>
                    <strong>{formatMoney(item.price)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-neutral-500">尚未選擇施工項目。</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 border-t border-neutral-200 p-5 lg:grid-cols-4">
          <p>地毯小計：<strong>{formatMoney(carpetSubtotal)}</strong></p>
          <p>座椅小計：<strong>{formatMoney(seatSubtotal)}</strong></p>
          <p>加購小計：<strong>{formatMoney(extraSubtotal)}</strong></p>
          <label>
            <span className="field-label">訂金</span>
            <input className="form-input max-w-40" value={deposit} onChange={(event) => setDeposit(event.target.value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ","))} inputMode="numeric" />
          </label>
        </div>
        <div className="bg-carcare-black p-5 text-white">
          <p className="text-sm">最終應付金額</p>
          <p className="text-5xl font-black text-carcare-yellow">{formatMoney(totalAmount)}</p>
        </div>
      </section>

      <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        <button type="button" className="primary-btn w-full justify-center py-4 text-lg" disabled={saving} onClick={() => saveQuote(false)}>
          {saving ? <><span className="button-spinner" />儲存中...</> : "儲存單據"}
        </button>
        <button type="button" className="secondary-btn w-full justify-center py-4 text-lg" disabled={saving} onClick={() => saveQuote(true)}>
          {saving ? <><span className="button-spinner" />處理中...</> : "儲存並匯出 PDF"}
        </button>
      </div>
      <div className="mobile-action-bar">
        <button type="button" className="primary-btn" disabled={saving} onClick={() => saveQuote(false)}>儲存</button>
        <button type="button" className="secondary-btn" disabled={uploading} onClick={() => document.getElementById("quote-photo-input")?.click()}>拍照</button>
        <button type="button" className="secondary-btn" onClick={() => document.getElementById("interior-quote-preview")?.scrollIntoView({ behavior: "smooth" })}>下一步</button>
      </div>
      <button type="button" className="back-to-top" aria-label="返回頂部" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
    </section>
  );
}

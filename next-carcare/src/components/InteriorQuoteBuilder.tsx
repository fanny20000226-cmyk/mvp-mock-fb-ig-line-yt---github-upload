"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { exportElementToPdf } from "@/lib/pdf";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type QuoteDraft = {
  customer_name: string;
  customer_phone: string;
  plate_no: string;
  custom_item: string;
  final_amount: string;
  note: string;
  items?: Option[];
};

type Option = {
  id: string;
  label: string;
  price: number;
};

type HotZone = {
  id: string;
  label: string;
  className: string;
};

const carTypes = ["一般5人座轎車", "七人座2-3-2", "九人商務車"];
const stores = ["三重門市", "桃園門市", "新竹門市", "台南門市"];
const categories = ["基礎保養", "加購", "贈送", "外包", "其他備註"];

const previewDiagramByCarType: Record<string, string> = {
  一般5人座轎車: "/car-diagram/car-preview-5seat.png",
  "七人座2-3-2": "/car-diagram/car-preview-7seat.png",
  九人商務車: "/car-diagram/car-preview-9seat.png"
};

const carpetDiagramByCarType: Record<string, string> = {
  一般5人座轎車: "/car-diagram/carpet-area-mark-5seat.png",
  "七人座2-3-2": "/car-diagram/carpet-area-mark-7seat.png",
  九人商務車: "/car-diagram/carpet-area-mark-9seat.png"
};

const fullCarpetDiagramByCarType: Record<string, string> = {
  一般5人座轎車: "/car-diagram/full-carpet-mark-5seat.png",
  "七人座2-3-2": "/car-diagram/full-carpet-mark-7seat.png",
  九人商務車: "/car-diagram/full-carpet-mark-9seat.png"
};

const carpetOptions: Option[] = [
  { id: "driver", label: "駕駛座地毯", price: 600 },
  { id: "passenger", label: "副駕地毯", price: 600 },
  { id: "left", label: "左半邊地毯", price: 600 },
  { id: "right", label: "右半邊地毯", price: 600 },
  { id: "all", label: "全車地毯", price: 2200 }
];

const seatOptions: Option[] = [
  { id: "driver-seat", label: "駕駛座椅", price: 800 },
  { id: "passenger-seat", label: "副駕座椅", price: 800 },
  { id: "rear-seat", label: "後排座椅", price: 1200 },
  { id: "rear-combo", label: "後排連體座椅", price: 1600 }
];

const extraOptions: Option[] = [
  { id: "odor", label: "煙味 / 異味處理", price: 1500 },
  { id: "pet", label: "寵物毛髮處理", price: 1200 },
  { id: "white", label: "白內裝重點處理", price: 2800 }
];

const carpetZones: HotZone[] = [
  { id: "passenger", label: "副駕地毯", className: "left-[18%] top-[21%] h-[21%] w-[20%]" },
  { id: "driver", label: "駕駛座地毯", className: "left-[18%] top-[55%] h-[21%] w-[20%]" },
  { id: "left", label: "左半邊地毯", className: "left-[44%] top-[18%] h-[24%] w-[25%]" },
  { id: "right", label: "右半邊地毯", className: "left-[44%] top-[54%] h-[24%] w-[25%]" },
  { id: "all", label: "全車地毯", className: "left-[12%] top-[13%] h-[70%] w-[78%] rounded-[2rem]" }
];

const seatZones: HotZone[] = [
  { id: "driver-seat", label: "駕駛座椅", className: "left-[22%] top-[64%] h-[14%] w-[13%]" },
  { id: "passenger-seat", label: "副駕座椅", className: "left-[22%] top-[49%] h-[13%] w-[13%]" },
  { id: "rear-seat", label: "後排座椅", className: "left-[47%] top-[52%] h-[31%] w-[20%]" },
  { id: "rear-combo", label: "後排連體座椅", className: "left-[66%] top-[52%] h-[31%] w-[22%]" }
];

const PDF_TEMPLATE_A_ID = "peiway-quote-template-a";
const PDF_TEMPLATE_B_ID = "peiway-workorder-template-b";
const DRAFT_KEY = "peiway-interior-quote-draft-v3";

function optionTotal(options: Option[], selected: string[]) {
  return options
    .filter((item) => selected.includes(item.id))
    .reduce((sum, item) => sum + item.price, 0);
}

function optionLabels(options: Option[], selected: string[]) {
  return options
    .filter((item) => selected.includes(item.id))
    .map((item) => `${item.label} $${item.price.toLocaleString()}`);
}

function selectedOptions(options: Option[], selected: string[]) {
  return options.filter((item) => selected.includes(item.id));
}

function money(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function parseAmount(value: string) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0;
}

export default function InteriorQuoteBuilder({
  onGenerate
}: {
  onGenerate: (draft: QuoteDraft) => Promise<void> | void;
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
  const [manualItems, setManualItems] = useState<Option[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [deposit, setDeposit] = useState("");
  const [suggestion, setSuggestion] = useState("建議依現場車況確認地毯、座椅與內裝重點區域後施工。");
  const [photoTab, setPhotoTab] = useState<"before" | "after">("before");
  const [beforePhotoUrls, setBeforePhotoUrls] = useState<string[]>([]);
  const [afterPhotoUrls, setAfterPhotoUrls] = useState<string[]>([]);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoteNo] = useState(() => `Q${Date.now()}`);
  const today = new Date().toLocaleDateString("zh-TW");

  function toggleCarpet(value: string) {
    setCarpets((current) => {
      if (value === "all") return current.includes("all") ? [] : ["all"];
      return current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current.filter((item) => item !== "all"), value];
    });
  }

  function toggleList(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function changeCarType(nextType: string) {
    setCarType(nextType);
  }

  const carpetSubtotal = useMemo(() => optionTotal(carpetOptions, carpets), [carpets]);
  const seatSubtotal = useMemo(() => optionTotal(seatOptions, seats), [seats]);
  const extraSubtotal = useMemo(() => optionTotal(extraOptions, extras), [extras]);
  const manualSubtotal = useMemo(() => manualItems.reduce((sum, item) => sum + item.price, 0), [manualItems]);
  const depositAmount = parseAmount(deposit);
  const baseTotal = carpetSubtotal + seatSubtotal;
  const quoteTotal = baseTotal + extraSubtotal + manualSubtotal;
  const finalTotal = Math.max(quoteTotal - depositAmount, 0);
  const previewDiagram = previewDiagramByCarType[carType] || previewDiagramByCarType[carTypes[0]];
  const carpetDiagram = carpets.includes("all")
    ? fullCarpetDiagramByCarType[carType] || fullCarpetDiagramByCarType[carTypes[0]]
    : carpetDiagramByCarType[carType] || carpetDiagramByCarType[carTypes[0]];

  const carpetLabelList = useMemo(() => optionLabels(carpetOptions, carpets), [carpets]);
  const seatLabelList = useMemo(() => optionLabels(seatOptions, seats), [seats]);
  const extraLabelList = useMemo(() => optionLabels(extraOptions, extras), [extras]);
  const activeCarpetItems = useMemo(() => selectedOptions(carpetOptions, carpets), [carpets]);
  const activeSeatItems = useMemo(() => selectedOptions(seatOptions, seats), [seats]);
  const activeExtraItems = useMemo(() => selectedOptions(extraOptions, extras), [extras]);
  const allQuoteItems = useMemo(
    () => [...activeCarpetItems, ...activeSeatItems, ...activeExtraItems, ...manualItems],
    [activeCarpetItems, activeSeatItems, activeExtraItems, manualItems]
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        carType?: string;
        store?: string;
        customerName?: string;
        customerPhone?: string;
        plateNo?: string;
        categoryA?: string;
        categoryB?: string;
        noteA?: string;
        noteB?: string;
        carpets?: string[];
        seats?: string[];
        extras?: string[];
        manualItems?: Option[];
        appointmentAt?: string;
        deposit?: string;
        suggestion?: string;
        beforePhotoUrls?: string[];
        afterPhotoUrls?: string[];
      };
      if (draft.carType) setCarType(draft.carType);
      if (draft.store) setStore(draft.store);
      setCustomerName(draft.customerName || "");
      setCustomerPhone(draft.customerPhone || "");
      setPlateNo(draft.plateNo || "");
      if (draft.categoryA) setCategoryA(draft.categoryA);
      if (draft.categoryB) setCategoryB(draft.categoryB);
      setNoteA(draft.noteA || "");
      setNoteB(draft.noteB || "");
      setCarpets(draft.carpets || []);
      setSeats(draft.seats || []);
      setExtras(draft.extras || []);
      setManualItems(draft.manualItems || []);
      setAppointmentAt(draft.appointmentAt || "");
      setDeposit(draft.deposit || "");
      if (draft.suggestion) setSuggestion(draft.suggestion);
      setBeforePhotoUrls(draft.beforePhotoUrls || []);
      setAfterPhotoUrls(draft.afterPhotoUrls || []);
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  function buildDraftPayload() {
    return {
      carType,
      store,
      customerName,
      customerPhone,
      plateNo,
      categoryA,
      categoryB,
      noteA,
      noteB,
      carpets,
      seats,
      extras,
      manualItems,
      appointmentAt,
      deposit,
      suggestion,
      beforePhotoUrls,
      afterPhotoUrls,
      savedAt: new Date().toISOString()
    };
  }

  function saveDraftToLocal() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(buildDraftPayload()));
    alert("草稿已儲存，下次回到製作報價單會自動還原。");
  }

  function clearDraft() {
    window.localStorage.removeItem(DRAFT_KEY);
  }

  function addManualItem() {
    const price = parseAmount(manualPrice);
    if (!manualName.trim()) return alert("請輸入補充項目名稱。");
    if (!price) return alert("請輸入補充項目金額。");
    setManualItems((current) => [
      ...current,
      { id: `manual-${Date.now()}`, label: manualName.trim(), price }
    ]);
    setManualName("");
    setManualPrice("");
  }

  function removeManualItem(id: string) {
    setManualItems((current) => current.filter((item) => item.id !== id));
  }

  function setPhotoUrls(phase: "before" | "after", updater: (current: string[]) => string[]) {
    if (phase === "before") {
      setBeforePhotoUrls(updater);
    } else {
      setAfterPhotoUrls(updater);
    }
  }

  async function addPhotoUrl() {
    const value = photoUrlInput.trim();
    if (!value) return;
    const currentPhotos = photoTab === "before" ? beforePhotoUrls : afterPhotoUrls;
    if (currentPhotos.length >= 8) return alert("每個分類最多 8 張照片。");
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
      const profile = await getCurrentProfile();
      if (profile?.shop_id) {
        await supabase.from("image_annotations").insert({
          shop_id: profile.shop_id,
          image_url: value,
          annot_data: {
            type: photoTab === "before" ? "quote_before_url_photo" : "quote_after_url_photo",
            plate_no: plateNo,
            car_type: carType,
            linked_at: new Date().toISOString()
          },
          created_by: profile.id
        });
      }
      setPhotoUrls(photoTab, (current) => [...current, value]);
      setPhotoUrlInput("");
    } catch {
      alert("請貼上正確的圖片網址。");
    }
  }

  function removePhoto(phase: "before" | "after", url: string) {
    setPhotoUrls(phase, (current) => current.filter((item) => item !== url));
    if (previewPhoto === url) setPreviewPhoto("");
  }

  async function uploadPhoto(file: File, phase: "before" | "after") {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("請先登入門店帳號後再上傳照片。");
    const currentPhotos = phase === "before" ? beforePhotoUrls : afterPhotoUrls;
    if (currentPhotos.length >= 8) return alert("每個分類最多上傳 8 張照片。");
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const path = `${profile.shop_id}/quote/${plateNo || "no-plate"}/${phase}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, {
      upsert: false
    });
    if (error) {
      setUploading(false);
      return alert(`${error.message}\n\n如果顯示 Bucket not found，請到 Supabase 建立 car-images bucket。`);
    }
    const { data } = supabase.storage.from("car-images").getPublicUrl(path);
    const publicUrl = data.publicUrl;
    await supabase.from("image_annotations").insert({
      shop_id: profile.shop_id,
      image_url: publicUrl,
      annot_data: {
        type: phase === "before" ? "quote_before_photo" : "quote_after_photo",
        plate_no: plateNo,
        car_type: carType,
        uploaded_at: new Date().toISOString()
      },
      created_by: profile.id
    });
    if (phase === "before") {
      setBeforePhotoUrls((current) => [...current, publicUrl]);
    } else {
      setAfterPhotoUrls((current) => [...current, publicUrl]);
    }
    setUploading(false);
  }

  async function generateQuote(exportDocs = false) {
    if (saving) return;
    if (!customerName || !plateNo) return alert("請先填寫車主姓名與車牌號碼。");
    if (!quoteTotal) return alert("請至少選擇一個地毯、座椅或附加項目。");
    setSaving(true);
    try {
      await onGenerate({
        customer_name: customerName,
        customer_phone: customerPhone,
        plate_no: plateNo,
        custom_item: `打翻評估報價 / ${carType}`,
        final_amount: String(finalTotal),
        note: [
          `PEIWAY報價單號：${quoteNo}`,
          `門市：${store}`,
          `車型：${carType}`,
          `預約時間：${appointmentAt || "未填"}`,
          `分類A：${categoryA} / ${noteA || "無"}`,
          `分類B：${categoryB} / ${noteB || "無"}`,
          `地毯：${carpetLabelList.join("；") || "未選"}`,
          `座椅：${seatLabelList.join("；") || "未選"}`,
          `附加項目：${extraLabelList.join("；") || "未選"}`,
          `手動補充：${manualItems.map((item) => `${item.label} ${money(item.price)}`).join("；") || "無"}`,
          `建議方案：${suggestion || "無"}`,
          `施工前照片：${beforePhotoUrls.join("；") || "無"}`,
          `施工後照片：${afterPhotoUrls.join("；") || "無"}`,
          `地毯小計：${money(carpetSubtotal)}`,
          `座椅小計：${money(seatSubtotal)}`,
          `附加項目：${money(extraSubtotal)}`,
          `手動補充：${money(manualSubtotal)}`,
          `訂金：${money(depositAmount)}`,
          `最終應付總金額：${money(finalTotal)}`
        ].join("\n"),
        items: allQuoteItems
      });
      clearDraft();
      if (exportDocs) {
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        await exportElementToPdf(PDF_TEMPLATE_A_ID, `PEIWAY_打翻評估報價單_${plateNo || quoteNo}.pdf`);
        await exportElementToPdf(PDF_TEMPLATE_B_ID, `PEIWAY_車輛施工確認工單_${plateNo || quoteNo}.pdf`);
      }
    } finally {
      setSaving(false);
    }
  }

  function PhotoGrid({ phase, urls }: { phase: "before" | "after"; urls: string[] }) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <div key={url} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="車況照片"
                loading="lazy"
                className="h-20 w-full cursor-zoom-in rounded-xl object-cover"
                onClick={() => setPreviewPhoto(url)}
              />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-xs font-black text-white opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100"
                onClick={() => removePhoto(phase, url)}
              >
                刪除
              </button>
            </div>
          ) : (
            <div key={index} className="flex h-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-2xl font-black text-neutral-400">
              +
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-carcare-yellow">CarCare System</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
            <p className="text-sm text-neutral-500">車內地毯、座椅、附加處理互動選取與即時計價</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="form-input min-w-40" value={store} onChange={(e) => setStore(e.target.value)}>
              {stores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button type="button" className="secondary-btn" onClick={saveDraftToLocal}>
              存草稿
            </button>
            <button type="button" className="primary-btn" onClick={() => generateQuote(true)}>
              匯出雙份文件
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">車型與車輛資料</h2>
          <select className="form-input" value={carType} onChange={(e) => changeCarType(e.target.value)}>
            {carTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <input className="form-input mt-3" placeholder="車主姓名" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="form-input mt-3" placeholder="聯絡電話" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          <input className="form-input mt-3" placeholder="車牌號碼" value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
          <div className="mt-3 overflow-hidden rounded-2xl bg-neutral-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewDiagram} alt={`${carType}預覽圖`} loading="lazy" className="mx-auto block h-auto max-h-64 w-full object-contain opacity-100 transition-opacity duration-200" />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">施作分類｜左備註</h2>
          <select className="form-input" value={categoryA} onChange={(e) => setCategoryA(e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <textarea className="form-input mt-3 min-h-28" placeholder="左排或前排施工備註" value={noteA} onChange={(e) => setNoteA(e.target.value)} />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">施作分類｜右備註</h2>
          <select className="form-input" value={categoryB} onChange={(e) => setCategoryB(e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <textarea className="form-input mt-3 min-h-28" placeholder="右排或後排施工備註" value={noteB} onChange={(e) => setNoteB(e.target.value)} />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">現場預約清單</h2>
          <input className="form-input mb-3" type="datetime-local" value={appointmentAt} onChange={(e) => setAppointmentAt(e.target.value)} />
          <div className="table-wrap">
            <table className="data-table text-sm">
              <thead>
                <tr>
                  <th>車主</th>
                  <th>車牌</th>
                  <th>地毯選項</th>
                  <th>施工項目</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{customerName || "-"}</td>
                  <td>{plateNo || "-"}</td>
                  <td>{carpetLabelList.join("、") || "-"}</td>
                  <td>{categoryA}</td>
                  <td>
                    <button type="button" className="primary-btn">
                      選作
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">{carType} 車內地毯示意圖</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {carpetOptions.map((item) => {
              const active = carpets.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleCarpet(item.id)}
                  className={active ? "primary-btn" : "secondary-btn"}
                >
                  {item.label}
                  <span className="ml-2 text-xs">{money(item.price)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl bg-neutral-100">
            <div className="relative mx-auto aspect-[16/9] w-full max-w-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={carpetDiagram}
                alt="地毯示意圖"
                loading="lazy"
                className="absolute inset-0 h-full w-full select-none rounded-2xl object-contain p-2 opacity-100 transition-opacity duration-200"
              />
              {carpetZones.map((zone) => {
                const active = carpets.includes(zone.id);
                const allZone = zone.id === "all";
                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-label={zone.label}
                    onClick={() => toggleCarpet(zone.id)}
                    className={`absolute ${zone.className} transition duration-200 ${allZone ? "z-0" : "z-10"} ${
                      active
                        ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow"
                        : allZone
                          ? "bg-transparent"
                          : "bg-transparent hover:bg-carcare-yellow/20"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm">
            <p className="font-black">已選地毯：{carpetLabelList.join("、") || "未選"}</p>
            <p className="mt-1 font-black text-carcare-yellow">地毯小計：{money(carpetSubtotal)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">建議方案與雲端照片</h2>
          <textarea className="form-input min-h-28" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
            <button type="button" className={photoTab === "before" ? "primary-btn" : "secondary-btn"} onClick={() => setPhotoTab("before")}>
              施工前照片
            </button>
            <button type="button" className={photoTab === "after" ? "primary-btn" : "secondary-btn"} onClick={() => setPhotoTab("after")}>
              施工後照片
            </button>
          </div>
          <label className="secondary-btn mt-3 block cursor-pointer text-center">
            {uploading ? "上傳中..." : "拍照 / 上傳圖片"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file, photoTab);
              }}
            />
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="form-input"
              placeholder="貼上圖片網址"
              value={photoUrlInput}
              onChange={(e) => setPhotoUrlInput(e.target.value)}
            />
            <button type="button" className="secondary-btn shrink-0" onClick={addPhotoUrl}>
              加入網址
            </button>
          </div>
          <div className="mt-3">
            <PhotoGrid phase={photoTab} urls={photoTab === "before" ? beforePhotoUrls : afterPhotoUrls} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">座椅分區互動示意圖</h2>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl bg-neutral-100">
            <div className="relative mx-auto aspect-square w-full max-w-3xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/car-diagram/seat-diagram.png"
                alt="座椅分區示意圖"
                loading="lazy"
                className="absolute inset-0 h-full w-full select-none rounded-2xl object-contain p-2 opacity-100 transition-opacity duration-200"
              />
              {seatZones.map((zone) => {
                const active = seats.includes(zone.id);
                return (
                  <button
                    key={zone.id}
                    type="button"
                    aria-label={zone.label}
                    onClick={() => toggleList(seats, zone.id, setSeats)}
                    className={`absolute z-10 ${zone.className} rounded-2xl transition duration-200 ${
                      active ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="mb-2 font-black">座椅選項</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {seatOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleList(seats, item.id, setSeats)}
                    className={seats.includes(item.id) ? "primary-btn w-full" : "secondary-btn w-full"}
                  >
                    {item.label} {money(item.price)}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="mb-2 font-black">附加項目</p>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {extraOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleList(extras, item.id, setExtras)}
                    className={extras.includes(item.id) ? "primary-btn w-full" : "secondary-btn w-full"}
                  >
                    {item.label} {money(item.price)}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3">
              <p className="mb-2 font-black">手動補充價目</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_130px_auto] xl:grid-cols-1">
                <input
                  className="form-input"
                  placeholder="項目名稱，例如：局部拆洗"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
                <input
                  className="form-input"
                  inputMode="numeric"
                  placeholder="金額"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                />
                <button type="button" className="secondary-btn" onClick={addManualItem}>
                  新增
                </button>
              </div>
              {manualItems.length ? (
                <div className="mt-3 space-y-2">
                  {manualItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                      <span className="font-bold">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-carcare-yellow">{money(item.price)}</span>
                        <button type="button" className="secondary-btn px-3 py-1 text-xs" onClick={() => removeManualItem(item.id)}>
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl bg-neutral-50 p-3 text-sm">
              <p className="font-black">已選座椅：{seatLabelList.join("、") || "未選"}</p>
              <p className="mt-1 font-black text-carcare-yellow">座椅小計：{money(seatSubtotal)}</p>
              <p className="mt-2 font-black">附加項目：{extraLabelList.join("、") || "未選"}</p>
              <p className="mt-1 font-black text-carcare-yellow">附加小計：{money(extraSubtotal)}</p>
              <p className="mt-2 font-black">手動補充：{manualItems.map((item) => item.label).join("、") || "無"}</p>
              <p className="mt-1 font-black text-carcare-yellow">補充小計：{money(manualSubtotal)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-carcare-black p-5 text-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <p className="text-sm text-white/60">地毯小計</p>
            <p className="text-2xl font-black text-carcare-yellow">{money(carpetSubtotal)}</p>
          </div>
          <div>
            <p className="text-sm text-white/60">座椅小計</p>
            <p className="text-2xl font-black text-carcare-yellow">{money(seatSubtotal)}</p>
          </div>
          <div>
            <p className="text-sm text-white/60">附加項目</p>
            <p className="text-2xl font-black text-carcare-yellow">{money(extraSubtotal)}</p>
          </div>
          <div>
            <p className="text-sm text-white/60">手動補充</p>
            <p className="text-2xl font-black text-carcare-yellow">{money(manualSubtotal)}</p>
          </div>
          <div>
            <p className="text-sm text-white/60">訂金</p>
            <input
              className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white"
              inputMode="numeric"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-carcare-yellow/40 bg-white/5 p-4">
          <p className="text-sm text-white/60">最終應付金額</p>
          <p className="text-5xl font-black text-carcare-yellow">{money(finalTotal)}</p>
        </div>
        <button type="button" onClick={() => generateQuote(true)} className="primary-btn mt-5 w-full text-lg">
          {saving ? "處理中..." : "建議並匯出雙份文件"}
        </button>
      </section>

      <section className="fixed left-[-9999px] top-0 w-[794px] bg-white text-neutral-900">
        <div id={PDF_TEMPLATE_A_ID} className="bg-white p-0">
          <PdfHeader title="PEIWAY 汽車施工評估報價單" store={store} quoteNo={quoteNo} today={today} />
          <div className="space-y-5 p-6">
            <PdfInfoBlock
              title="車主與車輛資訊"
              rows={[
                ["車主姓名", customerName || "-"],
                ["聯絡電話", customerPhone || "-"],
                ["車牌號碼", plateNo || "-"],
                ["車型", carType]
              ]}
            />
            <PdfItemTable title="地毯選取明細" items={activeCarpetItems} emptyText="未選地毯項目" />
            <PdfItemTable title="座椅選取明細" items={activeSeatItems} emptyText="未選座椅項目" />
            <PdfItemTable title="附加項目" items={[...activeExtraItems, ...manualItems]} emptyText="未選附加項目" />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <h3 className="font-black">車內示意圖</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={carpetDiagram} alt="地毯示意圖" className="mt-3 h-44 w-full object-contain" />
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="font-black">備註</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm">{[noteA, noteB, suggestion].filter(Boolean).join("\n") || "-"}</p>
              </div>
            </div>
            <PdfTotalBlock carpetSubtotal={carpetSubtotal} seatSubtotal={seatSubtotal} extraSubtotal={extraSubtotal + manualSubtotal} depositAmount={depositAmount} finalTotal={finalTotal} />
          </div>
        </div>

        <div id={PDF_TEMPLATE_B_ID} className="min-h-[1123px] bg-[#101010] p-8 text-neutral-950">
          <div className="mb-8 flex items-center justify-between text-white">
            <div className="text-5xl font-black tracking-tight">
              PEI<span className="text-[#dfff00]">WAY</span>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-black">車輛施工確認工單</h2>
              <p className="mt-2 rounded-full bg-white px-4 py-1 text-sm font-black text-[#111]">DIGITAL WORK ORDER</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <WorkCard title="車主與車輛資訊">
              <WorkLine label="車主姓名" value={customerName || "-"} />
              <WorkLine label="聯絡電話" value={customerPhone || "-"} />
              <WorkLine label="車輛品牌" value="PEIWAY評估" />
              <WorkLine label="車型" value={carType} />
              <WorkLine label="車牌號碼" value={plateNo || "-"} />
            </WorkCard>
            <WorkCard title="施工方案">
              {[...carpetLabelList, ...seatLabelList].slice(0, 4).map((item, index) => (
                <p key={item} className="border-b border-neutral-500 py-2 text-xl">
                  {index + 1}. {item}
                </p>
              ))}
              {![...carpetLabelList, ...seatLabelList].length ? <p className="py-2 text-xl">1. 未選施工項目</p> : null}
            </WorkCard>
            <PhotoWorkCard title="施工前照片" urls={beforePhotoUrls} />
            <PhotoWorkCard title="施工後照片" urls={afterPhotoUrls} />
            <WorkCard title="加購項目">
              {[...extraLabelList, ...manualItems.map((item) => `${item.label} ${money(item.price)}`)].slice(0, 4).map((item, index) => (
                <p key={item} className="border-b border-neutral-500 py-2 text-xl">
                  {index + 1}. {item}
                </p>
              ))}
              {![...extraLabelList, ...manualItems].length ? <p className="py-2 text-xl">1. 無</p> : null}
            </WorkCard>
            <WorkCard title="金額合計">
              <WorkLine label="施工方案金額" value={money(baseTotal)} />
              <WorkLine label="加購金額" value={money(extraSubtotal + manualSubtotal)} />
              <WorkLine label="訂金" value={money(depositAmount)} />
            </WorkCard>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-neutral-500 bg-white p-5">
            <h3 className="text-center text-3xl font-black">備註</h3>
            <p className="mt-3 min-h-28 whitespace-pre-wrap text-xl">{[noteA, noteB, suggestion].filter(Boolean).join("\n") || "-"}</p>
          </div>
          <div className="mt-5 rounded-2xl border border-neutral-600 bg-black p-6 text-center text-white">
            <p className="text-5xl font-black">總合計金額</p>
            <div className="mt-4 rounded-xl bg-[#dfff00] py-5 text-5xl font-black text-black">{money(finalTotal)}</div>
          </div>
          <div className="mt-5 rounded-2xl bg-white p-5 text-xl">
            <p className="text-center">本人已詳細閱讀施工內容、報價、保固與交車約定，同意本次施工內容</p>
            <div className="mt-6 flex justify-between">
              <span>客戶簽名：__________________</span>
              <span>簽署日期：____ 年 ____ 月 ____ 日</span>
            </div>
          </div>
        </div>
      </section>
      {previewPhoto ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhoto("")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewPhoto} alt="放大車況照片" className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl" />
        </button>
      ) : null}
    </div>
  );
}

function PdfHeader({ title, store, quoteNo, today }: { title: string; store: string; quoteNo: string; today: string }) {
  return (
    <div className="flex items-center justify-between bg-[#111] px-6 py-5 text-white">
      <div className="text-4xl font-black">
        PEI<span className="text-[#dfff00]">WAY</span>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="text-sm text-white/70">{store}</p>
      </div>
      <div className="text-right text-sm">
        <p>單號：{quoteNo}</p>
        <p>日期：{today}</p>
      </div>
    </div>
  );
}

function PdfInfoBlock({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 font-black">{title}</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {rows.map(([label, value]) => (
          <p key={label}>
            <span className="font-bold">{label}：</span>
            {value}
          </p>
        ))}
      </div>
    </div>
  );
}

function PdfItemTable({ title, items, emptyText }: { title: string; items: Option[]; emptyText: string }) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="mb-3 font-black">{title}</h3>
      {items.length ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2">項目</th>
              <th className="py-2">單價</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.label}</td>
                <td className="py-2">{money(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-neutral-500">{emptyText}</p>
      )}
    </div>
  );
}

function PdfTotalBlock({
  carpetSubtotal,
  seatSubtotal,
  extraSubtotal,
  depositAmount,
  finalTotal
}: {
  carpetSubtotal: number;
  seatSubtotal: number;
  extraSubtotal: number;
  depositAmount: number;
  finalTotal: number;
}) {
  return (
    <div className="rounded-xl bg-[#111] p-5 text-white">
      <div className="grid grid-cols-4 gap-3 text-sm">
        <p>地毯小計：{money(carpetSubtotal)}</p>
        <p>座椅小計：{money(seatSubtotal)}</p>
        <p>加購小計：{money(extraSubtotal)}</p>
        <p>訂金：{money(depositAmount)}</p>
      </div>
      <p className="mt-4 rounded-lg bg-[#ffc107] p-4 text-center text-3xl font-black text-black">總金額：{money(finalTotal)}</p>
    </div>
  );
}

function WorkCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-neutral-500 bg-white p-5">
      <h3 className="mb-3 inline-block border-b-4 border-[#dfff00] text-2xl font-black">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function WorkLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] border-b border-neutral-500 py-2 text-xl">
      <span className="font-black">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function PhotoWorkCard({ title, urls }: { title: string; urls: string[] }) {
  return (
    <WorkCard title={title}>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={title} className="h-24 w-full rounded-lg object-cover" />
          ) : (
            <div key={index} className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-neutral-500 text-5xl font-black">
              +
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-neutral-500 pt-2 text-center font-black">上傳圖片</p>
    </WorkCard>
  );
}

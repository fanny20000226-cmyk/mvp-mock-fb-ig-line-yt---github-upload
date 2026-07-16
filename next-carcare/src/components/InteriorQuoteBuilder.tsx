"use client";

import { useMemo, useState } from "react";
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
};

type Option = {
  id: string;
  label: string;
  price: number;
};

const carTypes = ["一般5人座轎車", "七人座2-3-2", "九人商務車"];
const stores = ["三重", "桃園", "新竹", "台南"];
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

const PDF_TEMPLATE_A_ID = "peiway-quote-template-a";
const PDF_TEMPLATE_B_ID = "peiway-workorder-template-b";

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
  const [appointmentAt, setAppointmentAt] = useState("");
  const [deposit, setDeposit] = useState("");
  const [suggestion, setSuggestion] = useState("建議先做局部深層清潔，完工後再依現場狀況追加保養。");
  const [photoTab, setPhotoTab] = useState<"before" | "after">("before");
  const [beforePhotoUrls, setBeforePhotoUrls] = useState<string[]>([]);
  const [afterPhotoUrls, setAfterPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleCarpet(value: string) {
    if (value === "all") {
      setCarpets(carpets.includes("all") ? [] : ["all"]);
      return;
    }
    setCarpets(
      carpets.includes(value)
        ? carpets.filter((item) => item !== value)
        : [...carpets.filter((item) => item !== "all"), value]
    );
  }

  function toggleList(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  const carpetSubtotal = useMemo(() => optionTotal(carpetOptions, carpets), [carpets]);
  const seatSubtotal = useMemo(() => optionTotal(seatOptions, seats), [seats]);
  const extraSubtotal = useMemo(() => optionTotal(extraOptions, extras), [extras]);
  const depositAmount = Number(deposit || 0);
  const baseTotal = carpetSubtotal + seatSubtotal;
  const quoteTotal = baseTotal + extraSubtotal;
  const finalTotal = Math.max(quoteTotal - depositAmount, 0);
  const previewDiagram = previewDiagramByCarType[carType] || previewDiagramByCarType[carTypes[0]];
  const carpetDiagram = carpets.includes("all")
    ? fullCarpetDiagramByCarType[carType] || fullCarpetDiagramByCarType[carTypes[0]]
    : carpetDiagramByCarType[carType] || carpetDiagramByCarType[carTypes[0]];

  const carpetLabelList = useMemo(() => optionLabels(carpetOptions, carpets), [carpets]);
  const seatLabelList = useMemo(() => optionLabels(seatOptions, seats), [seats]);
  const extraLabelList = useMemo(() => optionLabels(extraOptions, extras), [extras]);
  const [quoteNo] = useState(() => `Q${Date.now()}`);
  const today = new Date().toLocaleDateString("zh-TW");

  async function uploadPhoto(file: File, phase: "before" | "after") {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
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
      return alert(`${error.message}\n\n如果顯示 Bucket not found，請先在 Supabase 建立 car-images 儲存桶。`);
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
    if (!customerName || !plateNo) return alert("請先填寫車主姓名與車牌。");
    if (!quoteTotal) return alert("請先選擇地毯、座椅或附加項目。");
    setSaving(true);
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
        `建議方案：${suggestion || "無"}`,
        `施工前照片：${beforePhotoUrls.join("；") || "未上傳"}`,
        `施工後照片：${afterPhotoUrls.join("；") || "未上傳"}`,
        `地毯小計：$${carpetSubtotal.toLocaleString()}`,
        `座椅小計：$${seatSubtotal.toLocaleString()}`,
        `附加項目：$${extraSubtotal.toLocaleString()}`,
        `訂金：$${depositAmount.toLocaleString()}`,
        `最終應付總金額：$${finalTotal.toLocaleString()}`
      ].join("\n")
    });
    if (exportDocs) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await exportElementToPdf(PDF_TEMPLATE_A_ID, `PEIWAY_打翻評估報價單_${plateNo || quoteNo}.pdf`);
      await exportElementToPdf(PDF_TEMPLATE_B_ID, `PEIWAY_車輛施工確認工單_${plateNo || quoteNo}.pdf`);
    }
    setSaving(false);
  }

  function PhotoGrid({ urls }: { urls: string[] }) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return (
            <div key={index} className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-2xl font-black text-neutral-300">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`施工照片 ${index + 1}`} loading="lazy" className="h-full w-full rounded-xl object-cover" />
              ) : (
                "+"
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function WorkOrderPhotoGrid({ urls }: { urls: string[] }) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return (
            <div key={index} className="text-center">
              <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-neutral-400 bg-white text-5xl font-black text-black">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`施工照片 ${index + 1}`} className="h-full w-full rounded-xl object-cover" />
                ) : (
                  "+"
                )}
              </div>
              <p className="mt-1 text-xs font-black">點擊上傳</p>
            </div>
          );
        })}
      </div>
    );
  }

  function PdfHeader({ title }: { title: string }) {
    return (
      <div className="flex items-center justify-between bg-black px-6 py-4 text-white">
        <div className="rounded-xl border border-carcare-yellow px-4 py-2 text-2xl font-black tracking-[0.2em] text-carcare-yellow">
          PEIWAY
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black">{title}</h2>
          <p className="mt-1 text-xs text-white/70">{store}門市</p>
        </div>
        <div className="text-right text-xs leading-6">
          <p>工單：{quoteNo}</p>
          <p>日期：{today}</p>
        </div>
      </div>
    );
  }

  function PdfLineItemTable() {
    const items = [
      ...carpetOptions.filter((item) => carpets.includes(item.id)),
      ...seatOptions.filter((item) => seats.includes(item.id)),
      ...extraOptions.filter((item) => extras.includes(item.id))
    ];
    return (
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-neutral-100 text-left">
            <th className="border p-2">項目</th>
            <th className="border p-2">分類</th>
            <th className="border p-2">單價</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.label}</td>
              <td className="border p-2">
                {carpetOptions.some((option) => option.id === item.id)
                  ? "地毯"
                  : seatOptions.some((option) => option.id === item.id)
                    ? "座椅"
                    : "加購"}
              </td>
              <td className="border p-2">${item.price.toLocaleString()}</td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td className="border p-2 text-neutral-500" colSpan={3}>尚未選擇項目</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">製作報價單</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="form-input w-44" value={store} onChange={(e) => setStore(e.target.value)}>
              {stores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button type="button" className="secondary-btn">存草稿</button>
            <button type="button" className="secondary-btn">通知</button>
            <span className="rounded-full bg-carcare-black px-4 py-3 text-sm font-black text-white">
              店長
            </span>
            <button type="button" onClick={() => generateQuote(false)} className="primary-btn">
              {saving ? "送出中..." : "送出報價"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">車型與車輛資料</h2>
          <div className="space-y-3">
            <select className="form-input" value={carType} onChange={(e) => setCarType(e.target.value)}>
              {carTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input className="form-input" placeholder="車主姓名" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <input className="form-input" placeholder="聯絡電話" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            <input className="form-input" placeholder="車牌號碼" value={plateNo} onChange={(e) => setPlateNo(e.target.value)} />
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-[#dceff7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewDiagram}
              alt="車型完整底圖"
              loading="lazy"
              className="h-48 w-full object-contain"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">施作分類 A</h2>
          <select className="form-input" value={categoryA} onChange={(e) => setCategoryA(e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <textarea className="form-input mt-3 min-h-28" placeholder="左排備註" value={noteA} onChange={(e) => setNoteA(e.target.value)} />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">施作分類 B</h2>
          <select className="form-input" value={categoryB} onChange={(e) => setCategoryB(e.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <textarea className="form-input mt-3 min-h-28" placeholder="右排備註" value={noteB} onChange={(e) => setNoteB(e.target.value)} />
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
                  <th>地毯</th>
                  <th>施工</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{customerName || "-"}</td>
                  <td>{plateNo || "-"}</td>
                <td>{carpetLabelList.join("、") || "-"}</td>
                  <td>{categoryA}</td>
                  <td><button type="button" className="primary-btn">選作</button></td>
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
                  <span className="ml-2 text-xs">${item.price.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl bg-neutral-100">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={carpetDiagram}
                alt="地毯分區示意圖"
                loading="lazy"
                className="mx-auto block max-h-64 w-full object-contain p-3 select-none"
              />
              <button
                type="button"
                aria-label="駕駛座地毯"
                onClick={() => toggleCarpet("driver")}
                className={`absolute left-[9%] top-[16%] z-10 h-[22%] w-[21%] rounded-2xl transition ${carpets.includes("driver") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="副駕地毯"
                onClick={() => toggleCarpet("passenger")}
                className={`absolute left-[9%] top-[56%] z-10 h-[22%] w-[21%] rounded-2xl transition ${carpets.includes("passenger") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="左半邊地毯"
                onClick={() => toggleCarpet("left")}
                className={`absolute left-[40%] top-[16%] z-10 h-[22%] w-[22%] rounded-2xl transition ${carpets.includes("left") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="右半邊地毯"
                onClick={() => toggleCarpet("right")}
                className={`absolute left-[40%] top-[56%] z-10 h-[22%] w-[22%] rounded-2xl transition ${carpets.includes("right") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="全車地毯"
                onClick={() => toggleCarpet("all")}
                className={`absolute left-[9%] top-[13%] z-0 h-[68%] w-[76%] rounded-[2rem] transition ${carpets.includes("all") ? "bg-carcare-yellow/30 ring-4 ring-carcare-yellow" : "bg-transparent"}`}
              />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm">
            <p className="font-black">已選地毯：{carpetLabelList.join("、") || "未選"}</p>
            <p className="mt-1 font-black text-carcare-yellow">地毯小計：${carpetSubtotal.toLocaleString()}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">建議方案 & 雲端照片</h2>
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
            {uploading ? "上傳中..." : "拍照 / 上傳車況圖片"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file, photoTab);
            }} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(photoTab === "before" ? beforePhotoUrls : afterPhotoUrls).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="車況照片" loading="lazy" className="h-24 w-full rounded-xl object-cover" />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">座椅分區互動示意圖</h2>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl bg-neutral-100">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/car-diagram/seat-diagram.png"
                alt="座椅分區互動圖"
                loading="lazy"
                className="mx-auto block max-h-[560px] w-full object-contain p-3 select-none"
              />
              <button
                type="button"
                aria-label="駕駛座椅"
                onClick={() => toggleList(seats, "driver-seat", setSeats)}
                className={`absolute left-[14%] top-[19%] h-[8%] w-[23%] rounded-xl transition ${seats.includes("driver-seat") ? "bg-carcare-yellow/55 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="副駕座椅"
                onClick={() => toggleList(seats, "passenger-seat", setSeats)}
                className={`absolute left-[39%] top-[19%] h-[8%] w-[23%] rounded-xl transition ${seats.includes("passenger-seat") ? "bg-carcare-yellow/55 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="後排座椅"
                onClick={() => toggleList(seats, "rear-seat", setSeats)}
                className={`absolute left-[65%] top-[19%] h-[8%] w-[21%] rounded-xl transition ${seats.includes("rear-seat") ? "bg-carcare-yellow/55 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="後排連體座椅"
                onClick={() => toggleList(seats, "rear-combo", setSeats)}
                className={`absolute left-[39%] top-[36%] h-[8%] w-[23%] rounded-xl transition ${seats.includes("rear-combo") ? "bg-carcare-yellow/55 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="駕駛座椅車內區"
                onClick={() => toggleList(seats, "driver-seat", setSeats)}
                className={`absolute left-[23%] top-[66%] h-[12%] w-[12%] rounded-2xl transition ${seats.includes("driver-seat") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="副駕座椅車內區"
                onClick={() => toggleList(seats, "passenger-seat", setSeats)}
                className={`absolute left-[23%] top-[80%] h-[12%] w-[12%] rounded-2xl transition ${seats.includes("passenger-seat") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="後排座椅車內區"
                onClick={() => toggleList(seats, "rear-seat", setSeats)}
                className={`absolute left-[48%] top-[68%] h-[21%] w-[20%] rounded-2xl transition ${seats.includes("rear-seat") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
              <button
                type="button"
                aria-label="後排連體座椅車內區"
                onClick={() => toggleList(seats, "rear-combo", setSeats)}
                className={`absolute left-[67%] top-[68%] h-[21%] w-[23%] rounded-2xl transition ${seats.includes("rear-combo") ? "bg-carcare-yellow/45 ring-4 ring-carcare-yellow" : "bg-transparent hover:bg-carcare-yellow/20"}`}
              />
            </div>
          </div>
          <div className="space-y-3">
            {seatOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleList(seats, item.id, setSeats)}
                className={seats.includes(item.id) ? "primary-btn w-full" : "secondary-btn w-full"}
              >
                {item.label} ${item.price.toLocaleString()}
              </button>
            ))}
            {extraOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleList(extras, item.id, setExtras)}
                className={extras.includes(item.id) ? "primary-btn w-full" : "secondary-btn w-full"}
              >
                {item.label} ${item.price.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-carcare-black p-5 text-white shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <div><p className="text-sm text-white/60">地毯小計</p><p className="text-2xl font-black text-carcare-yellow">${carpetSubtotal.toLocaleString()}</p></div>
          <div><p className="text-sm text-white/60">座椅小計</p><p className="text-2xl font-black text-carcare-yellow">${seatSubtotal.toLocaleString()}</p></div>
          <div><p className="text-sm text-white/60">附加項目</p><p className="text-2xl font-black text-carcare-yellow">${extraSubtotal.toLocaleString()}</p></div>
          <div>
            <p className="text-sm text-white/60">訂金</p>
            <input className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-carcare-yellow/40 bg-white/5 p-4">
          <p className="text-sm text-white/60">最終應付總金額</p>
          <p className="text-5xl font-black text-carcare-yellow">${finalTotal.toLocaleString()}</p>
        </div>
        <button type="button" onClick={() => generateQuote(true)} className="primary-btn mt-5 w-full text-lg">
          {saving ? "產生中..." : "建議並匯出雙份文件"}
        </button>
      </section>

      <section className="fixed left-[-9999px] top-0 w-[794px] bg-white text-neutral-900">
        <div id={PDF_TEMPLATE_A_ID} className="bg-white p-0">
          <PdfHeader title="PEIWAY 汽車施工評估報價單" />
          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <h3 className="font-black">車主車輛資訊</h3>
                <p>車主：{customerName || "-"}</p>
                <p>電話：{customerPhone || "-"}</p>
                <p>車牌：{plateNo || "-"}</p>
                <p>車型：{carType}</p>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="font-black">金額總覽</h3>
                <p>地毯小計：${carpetSubtotal.toLocaleString()}</p>
                <p>座椅小計：${seatSubtotal.toLocaleString()}</p>
                <p>加購小計：${extraSubtotal.toLocaleString()}</p>
                <p>訂金：${depositAmount.toLocaleString()}</p>
                <p className="mt-2 text-2xl font-black text-carcare-yellow">總金額：${finalTotal.toLocaleString()}</p>
              </div>
            </div>
            <PdfLineItemTable />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-3">
                <h3 className="mb-2 font-black">車內選取示意圖</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={carpetDiagram} alt="地毯示意圖" className="h-44 w-full object-contain" />
              </div>
              <div className="rounded-xl border p-3">
                <h3 className="mb-2 font-black">座椅示意圖</h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/car-diagram/seat-diagram.png" alt="座椅示意圖" className="h-44 w-full object-contain" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-2 font-black">施工前照片</h3>
                <PhotoGrid urls={beforePhotoUrls} />
              </div>
              <div>
                <h3 className="mb-2 font-black">施工後照片</h3>
                <PhotoGrid urls={afterPhotoUrls} />
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="font-black">綜合備註</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {categoryA}：{noteA || "無"}{"\n"}
                {categoryB}：{noteB || "無"}{"\n"}
                建議方案：{suggestion || "無"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="rounded-xl border p-5 text-center">門市店員簽署</div>
              <div className="rounded-xl border p-5 text-center">客戶確認簽署</div>
            </div>
          </div>
        </div>

        <div id={PDF_TEMPLATE_B_ID} className="mt-12 bg-[#101010] p-8 text-black">
          <div className="mb-6 flex items-center justify-between text-white">
            <div className="rounded-xl border-4 border-white px-6 py-2 text-5xl font-black italic tracking-tight">
              PEI<span className="text-[#dfff00]">WAY</span>
            </div>
            <div className="text-right">
              <h2 className="text-5xl font-black tracking-wide">車輛施工確認工單</h2>
              <div className="mt-3 inline-block rounded-lg bg-white px-5 py-1 text-xl font-black text-[#dfff00]">
                DIGITAL WORK ORDER
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <h3 className="mb-3 border-b-4 border-[#dfff00] pb-1 text-2xl font-black">車主與車輛資訊</h3>
              <div className="grid grid-cols-[1fr_1.6fr] border-b border-neutral-500 py-2 text-lg">
                <span className="font-black">車主姓名</span><span>{customerName || "-"}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr] border-b border-neutral-500 py-2 text-lg">
                <span className="font-black">聯絡電話</span><span>{customerPhone || "-"}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr] border-b border-neutral-500 py-2 text-lg">
                <span className="font-black">車廠品牌</span><span>{carType}</span>
              </div>
              <div className="grid grid-cols-[1fr_1.6fr] py-2 text-lg">
                <span className="font-black">車牌號碼</span><span className="rounded-lg border border-neutral-500 px-3 py-1">{plateNo || "-"}</span>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <div className="mb-3 flex items-center justify-between border-b border-neutral-500 pb-2">
                <h3 className="border-b-4 border-[#dfff00] pb-1 text-2xl font-black">施工方案</h3>
                <div className="flex gap-2 text-sm font-black">
                  <span className="rounded-full border px-3 py-1">工單編號</span>
                  <span className="rounded-full border px-3 py-1">開單日期</span>
                </div>
              </div>
              {[...carpetLabelList, ...seatLabelList].slice(0, 4).map((item, index) => (
                <div key={item} className="border-b border-neutral-500 py-2 text-xl font-black">
                  {index + 1}. <span className="ml-3 font-bold">{item}</span>
                </div>
              ))}
              {![...carpetLabelList, ...seatLabelList].length ? (
                <div className="border-b border-neutral-500 py-2 text-xl font-black">1.</div>
              ) : null}
            </div>

            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <h3 className="mb-4 border-b-4 border-[#dfff00] pb-1 text-2xl font-black">施工前照片</h3>
              <WorkOrderPhotoGrid urls={beforePhotoUrls} />
              <p className="mt-4 border-t border-neutral-500 pt-2 text-center text-lg font-black">上傳圖片</p>
            </div>

            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <h3 className="mb-4 border-b-4 border-[#dfff00] pb-1 text-2xl font-black">施工後照片</h3>
              <WorkOrderPhotoGrid urls={afterPhotoUrls} />
              <p className="mt-4 border-t border-neutral-500 pt-2 text-center text-lg font-black">上傳圖片</p>
            </div>

            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <h3 className="mb-3 text-2xl font-black">加購項目</h3>
              {extraLabelList.slice(0, 4).map((item, index) => (
                <div key={item} className="border-b border-neutral-500 py-2 text-xl">
                  {index + 1}. {item}
                </div>
              ))}
              {!extraLabelList.length ? [1, 2, 3, 4].map((item) => (
                <div key={item} className="border-b border-neutral-500 py-2 text-xl">{item}.</div>
              )) : null}
            </div>

            <div className="rounded-2xl border-2 border-neutral-600 bg-white p-4">
              <h3 className="mb-3 text-2xl font-black">金額合計</h3>
              <div className="border-b border-neutral-500 py-2 text-xl">金額合計　${quoteTotal.toLocaleString()}</div>
              <div className="border-b border-neutral-500 py-2 text-xl">施工方案金額　${baseTotal.toLocaleString()}</div>
              <div className="border-b border-neutral-500 py-2 text-xl">加購金額　${extraSubtotal.toLocaleString()}</div>
              <div className="grid grid-cols-[1fr_1.4fr] py-2 text-xl">
                <span>訂金</span><span className="rounded-lg border border-neutral-500 text-center font-black">${depositAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border-2 border-neutral-600 bg-white p-5">
            <h3 className="mb-3 text-center text-3xl font-black">備註</h3>
            <p className="min-h-36 whitespace-pre-wrap text-lg">
              {noteA || noteB || suggestion ? `${noteA || ""}\n${noteB || ""}\n${suggestion || ""}` : ""}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-neutral-500 bg-black p-6 text-center text-white">
            <h3 className="text-5xl font-black">總合計金額</h3>
            <div className="mt-5 rounded-xl bg-[#dfff00] py-5 text-5xl font-black text-black">
              ${finalTotal.toLocaleString()}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white p-5 text-lg font-black">
            <p className="text-center">本人已詳細閱讀施工內容、報價、保固與交車約定，同意本次施工內容</p>
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>客戶簽名：____________________</div>
              <div>簽署日期：____ 年 ____ 月 ____ 日</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

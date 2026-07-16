"use client";

import { useMemo, useState } from "react";
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
  const [suggestion, setSuggestion] = useState("建議先做局部深層清潔，完工後再依現場狀況追加保養。");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
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
  const finalTotal = carpetSubtotal + seatSubtotal + extraSubtotal;

  async function uploadPhoto(file: File) {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const path = `${profile.shop_id}/quote/${plateNo || "no-plate"}/${Date.now()}-${safeName}`;
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
        type: "quote_photo",
        plate_no: plateNo,
        car_type: carType,
        uploaded_at: new Date().toISOString()
      },
      created_by: profile.id
    });
    setPhotoUrls((current) => [...current, publicUrl]);
    setUploading(false);
  }

  async function generateQuote() {
    if (saving) return;
    if (!customerName || !plateNo) return alert("請先填寫車主姓名與車牌。");
    if (!finalTotal) return alert("請先選擇地毯、座椅或附加項目。");
    setSaving(true);
    await onGenerate({
      customer_name: customerName,
      customer_phone: customerPhone,
      plate_no: plateNo,
      custom_item: `打翻評估報價 / ${carType}`,
      final_amount: String(finalTotal),
      note: [
        `門市：${store}`,
        `車型：${carType}`,
        `預約時間：${appointmentAt || "未填"}`,
        `分類A：${categoryA} / ${noteA || "無"}`,
        `分類B：${categoryB} / ${noteB || "無"}`,
        `地毯：${optionLabels(carpetOptions, carpets).join("；") || "未選"}`,
        `座椅：${optionLabels(seatOptions, seats).join("；") || "未選"}`,
        `附加項目：${optionLabels(extraOptions, extras).join("；") || "未選"}`,
        `建議方案：${suggestion || "無"}`,
        `照片：${photoUrls.join("；") || "未上傳"}`,
        `地毯小計：$${carpetSubtotal.toLocaleString()}`,
        `座椅小計：$${seatSubtotal.toLocaleString()}`,
        `附加項目：$${extraSubtotal.toLocaleString()}`,
        `最終總報價：$${finalTotal.toLocaleString()}`
      ].join("\n")
    });
    setSaving(false);
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
            <button type="button" onClick={generateQuote} className="primary-btn">
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
                  <td>{optionLabels(carpetOptions, carpets).join("、") || "-"}</td>
                  <td>{categoryA}</td>
                  <td><button type="button" className="primary-btn">選作</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">5人座車內地毯示意圖</h2>
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
          <div className="mt-4 rounded-2xl bg-neutral-100 p-3">
            <div className="relative mx-auto h-56 max-w-sm rounded-[2rem] border-4 border-carcare-black bg-white">
              <button type="button" onClick={() => toggleCarpet("driver")} className={`absolute left-12 top-12 h-16 w-20 rounded-xl border-2 ${carpets.includes("driver") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>駕</button>
              <button type="button" onClick={() => toggleCarpet("passenger")} className={`absolute right-12 top-12 h-16 w-20 rounded-xl border-2 ${carpets.includes("passenger") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>副</button>
              <button type="button" onClick={() => toggleCarpet("left")} className={`absolute left-12 bottom-12 h-16 w-20 rounded-xl border-2 ${carpets.includes("left") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>左</button>
              <button type="button" onClick={() => toggleCarpet("right")} className={`absolute right-12 bottom-12 h-16 w-20 rounded-xl border-2 ${carpets.includes("right") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>右</button>
            </div>
          </div>
          <p className="mt-3 text-sm font-black">地毯小計：${carpetSubtotal.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-black">建議方案 & 雲端照片</h2>
          <textarea className="form-input min-h-28" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
          <label className="secondary-btn mt-3 block cursor-pointer text-center">
            {uploading ? "上傳中..." : "拍照 / 上傳車況圖片"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file);
            }} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="車況照片" loading="lazy" className="h-24 w-full rounded-xl object-cover" />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black">座椅分區互動示意圖</h2>
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-neutral-100 p-4">
            <div className="relative mx-auto h-72 max-w-3xl rounded-[3rem] border-4 border-carcare-black bg-white">
              <button type="button" onClick={() => toggleList(seats, "driver-seat", setSeats)} className={`absolute left-24 top-16 h-20 w-24 rounded-2xl border-2 ${seats.includes("driver-seat") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>駕駛座椅</button>
              <button type="button" onClick={() => toggleList(seats, "passenger-seat", setSeats)} className={`absolute left-24 bottom-16 h-20 w-24 rounded-2xl border-2 ${seats.includes("passenger-seat") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>副駕座椅</button>
              <button type="button" onClick={() => toggleList(seats, "rear-seat", setSeats)} className={`absolute right-44 top-16 h-20 w-28 rounded-2xl border-2 ${seats.includes("rear-seat") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>後排座椅</button>
              <button type="button" onClick={() => toggleList(seats, "rear-combo", setSeats)} className={`absolute right-44 bottom-16 h-20 w-28 rounded-2xl border-2 ${seats.includes("rear-combo") ? "border-carcare-yellow bg-carcare-yellow/70" : "border-neutral-400 bg-white"}`}>後排連體</button>
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
          <div><p className="text-sm text-white/60">最終總報價</p><p className="text-4xl font-black text-carcare-yellow">${finalTotal.toLocaleString()}</p></div>
        </div>
        <button type="button" onClick={generateQuote} className="primary-btn mt-5 w-full text-lg">
          {saving ? "產生中..." : "建議並生成報價"}
        </button>
      </section>
    </div>
  );
}

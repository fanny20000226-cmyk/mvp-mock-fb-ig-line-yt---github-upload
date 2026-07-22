"use client";

import { useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { ensureCustomerVehicleArchive } from "@/lib/customerArchive";
import { getCurrentProfile } from "@/lib/auth";
import { exportElementToPdf } from "@/lib/pdf";
import { supabase } from "@/lib/supabase";

type CarSearchRow = {
  id: string;
  customer_id: string | null;
  owner_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
};

type QuickOption = {
  id: string;
  label: string;
  category: "base" | "carpet" | "seat" | "extra" | "gift" | "outsourcing";
  price: number;
};

const carTypes = ["一般5人座轎車", "七人座2-3-2", "九人商務車"];
const categoryOptions = ["基礎保養", "加購", "贈送", "外包", "其他備註"];

const quickOptions: QuickOption[] = [
  { id: "base-9999", label: "9999內外超值", category: "base", price: 9999 },
  { id: "base-interior", label: "內裝深層拆洗", category: "base", price: 6800 },
  { id: "carpet-driver", label: "駕駛座地毯", category: "carpet", price: 600 },
  { id: "carpet-passenger", label: "副駕地毯", category: "carpet", price: 600 },
  { id: "carpet-left", label: "左半邊地毯", category: "carpet", price: 600 },
  { id: "carpet-right", label: "右半邊地毯", category: "carpet", price: 600 },
  { id: "carpet-all", label: "全車地毯", category: "carpet", price: 2200 },
  { id: "seat-driver", label: "駕駛座椅", category: "seat", price: 800 },
  { id: "seat-passenger", label: "副駕座椅", category: "seat", price: 800 },
  { id: "seat-rear", label: "後排座椅", category: "seat", price: 1200 },
  { id: "seat-bench", label: "後排連體座椅", category: "seat", price: 1600 },
  { id: "extra-smell", label: "煙味異味處理", category: "extra", price: 1500 },
  { id: "extra-pet", label: "寵物毛髮處理", category: "extra", price: 1200 },
  { id: "gift-coating", label: "贈送鍍膜保固", category: "gift", price: 0 },
];

const categoryLabel: Record<QuickOption["category"], string> = {
  base: "基礎保養",
  carpet: "地毯",
  seat: "座椅",
  extra: "加購",
  gift: "贈送",
  outsourcing: "外包",
};

const money = (value: number) => `$${value.toLocaleString("zh-TW")}`;

function PhotoGrid({
  title,
  photos,
  onRemove,
}: {
  title: string;
  photos: string[];
  onRemove: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-neutral-700">{title}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = photos[index];
          return (
            <div key={`${title}-${index}`} className="aspect-square overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
              {url ? (
                <button type="button" className="relative h-full w-full" onClick={() => window.open(url, "_blank")}>
                  <img src={url} alt={`${title}${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  <span
                    role="button"
                    tabIndex={0}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(url);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onRemove(url);
                    }}
                  >
                    刪除
                  </span>
                </button>
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-black text-neutral-300">+</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MobileOrderPage() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [results, setResults] = useState<CarSearchRow[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [brand, setBrand] = useState("");
  const [carModel, setCarModel] = useState(carTypes[0]);
  const [serviceCategory, setServiceCategory] = useState(categoryOptions[0]);
  const [remark, setRemark] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [deposit, setDeposit] = useState(0);
  const [photoPhase, setPhotoPhase] = useState<"before" | "after">("before");
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [quoteNo, setQuoteNo] = useState(`Q${Date.now()}`);

  const selectedItems = useMemo(() => quickOptions.filter((item) => selected.includes(item.id)), [selected]);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - deposit);

  const toggleOption = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const searchCustomer = async () => {
    const keyword = searchKeyword.trim();
    if (!keyword) return;
    const { data, error } = await supabase
      .from("cars")
      .select("id,customer_id,owner_name,customer_phone,plate_no,brand,model")
      .or(`plate_no.ilike.%${keyword}%,customer_phone.ilike.%${keyword}%`)
      .limit(8);
    if (error) {
      window.alert(`查詢失敗：${error.message}`);
      return;
    }
    setResults((data || []) as CarSearchRow[]);
  };

  const applyCustomer = (row: CarSearchRow) => {
    setCustomerName(row.owner_name || "");
    setCustomerPhone(row.customer_phone || "");
    setPlateNo(row.plate_no || "");
    setBrand(row.brand || "");
    setCarModel(row.model || carTypes[0]);
    setResults([]);
  };

  const uploadPhoto = async (file: File) => {
    const target = photoPhase === "before" ? beforePhotos : afterPhotos;
    if (target.length >= 8) {
      window.alert("每個分類最多8張照片");
      return;
    }

    const profile = await getCurrentProfile();
    const safeName = file.name.replace(/[^\w.-]/g, "_");
    const safePlate = (plateNo || "no-plate").replace(/[^\w.-]/g, "_");
    const path = `${profile?.shop_id || "public"}/quick-order/${safePlate}/${photoPhase}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, { upsert: true });

    let url = "";
    if (!error) {
      url = supabase.storage.from("car-images").getPublicUrl(path).data.publicUrl;
      await supabase.from("image_annotations").insert({
        shop_id: profile?.shop_id || null,
        image_url: url,
        annot_data: { plate_no: plateNo, phase: photoPhase, source: "mobile-order" },
      });
    } else {
      url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.readAsDataURL(file);
      });
      window.alert("照片已先放在本機預覽。若要永久雲端保存，請確認 Supabase Storage 已建立 car-images bucket。");
    }

    if (photoPhase === "before") setBeforePhotos((current) => [...current, url]);
    else setAfterPhotos((current) => [...current, url]);
  };

  const saveQuotation = async (exportPdf = false) => {
    if (!customerName.trim() || !customerPhone.trim() || !plateNo.trim() || !carModel.trim()) {
      window.alert("請先填寫姓名、電話、車牌、車型");
      return;
    }
    if (!selectedItems.length) {
      window.alert("請至少選擇一個施工項目");
      return;
    }

    setSaving(true);
    try {
      const profile = await getCurrentProfile();
      const nextQuoteNo = `Q${Date.now()}`;
      setQuoteNo(nextQuoteNo);

      const archive = await ensureCustomerVehicleArchive({
        ownerName: customerName,
        phone: customerPhone,
        plateNo,
        brand,
        model: carModel,
        shopId: profile?.shop_id || null,
        beforePhotos,
        afterPhotos,
      });

      const { data: quotation, error } = await supabase
        .from("quotations")
        .insert({
          shop_id: profile?.shop_id || null,
          customer_id: archive.customerId,
          car_id: archive.carId,
          quote_no: nextQuoteNo,
          owner_name: customerName,
          customer_phone: customerPhone,
          plate_no: plateNo,
          brand,
          model: carModel,
          status: "draft",
          category: serviceCategory,
          total_amount: total,
          deposit_amount: deposit,
          remark,
          selected_area: {
            source: "mobile-order",
            selected_items: selectedItems,
            before_photos: beforePhotos,
            after_photos: afterPhotos,
          },
        })
        .select("id")
        .single();

      if (error) throw error;

      if (quotation?.id) {
        const rows = selectedItems.map((item) => ({
          quotation_id: quotation.id,
          shop_id: profile?.shop_id || null,
          service_item_id: null,
          item_name: item.label,
          category: categoryLabel[item.category],
          qty: 1,
          unit_price: item.price,
          subtotal: item.price,
          remark: "行動快速開單",
        }));
        if (rows.length) await supabase.from("quotation_items").insert(rows);
      }

      window.alert("行動快速開單已儲存，電腦後台也可以看到了。");
      if (exportPdf) await exportElementToPdf("mobile-order-pdf", `PEIWAY_快速報價_${plateNo || nextQuoteNo}.pdf`);
    } catch (error) {
      window.alert(`儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireAuth allow={["admin", "shop_manager", "vice_manager", "worker"]}>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-28">
        <header className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-neutral-500">PEIWAY 現場手機開單</p>
            <h1 className="text-2xl font-black text-neutral-950">行動快速開單</h1>
            <p className="text-sm text-neutral-600">搜尋客戶、選施工項目、拍照、儲存報價，手機現場直接完成。</p>
          </div>
          <button type="button" className="secondary-btn" onClick={() => window.history.back()}>返回上一頁</button>
        </header>

        <section className="card space-y-4">
          <h2 className="text-lg font-black">客戶與車輛資訊</h2>
          <div className="flex gap-2">
            <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="輸入電話或車牌搜尋舊客戶" className="input flex-1" />
            <button type="button" className="primary-btn min-w-[86px]" onClick={searchCustomer}>搜尋</button>
          </div>
          {results.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
              {results.map((row) => (
                <button key={row.id} type="button" className="mb-2 flex w-full items-center justify-between rounded-xl bg-white p-3 text-left text-sm shadow-sm last:mb-0" onClick={() => applyCustomer(row)}>
                  <span>
                    <strong>{row.owner_name || "未命名客戶"}</strong>
                    <span className="block text-neutral-500">{row.customer_phone || "-"} / {row.plate_no || "-"}</span>
                  </span>
                  <span className="text-carcare-yellow">帶入</span>
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="車主姓名" className="input" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="聯絡電話" className="input" />
            <input value={plateNo} onChange={(event) => setPlateNo(event.target.value)} placeholder="車牌號碼" className="input" />
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="車廠品牌" className="input" />
            <select value={carModel} onChange={(event) => setCarModel(event.target.value)} className="input sm:col-span-2">
              {carTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black">施工項目選單</h2>
            <select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="input sm:w-48">
              {categoryOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quickOptions.map((item) => {
              const active = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleOption(item.id)}
                  className={`min-h-[74px] rounded-xl border px-3 py-3 text-left transition ${active ? "border-carcare-yellow bg-carcare-yellow text-neutral-950" : "border-neutral-300 bg-white text-neutral-900 hover:border-carcare-yellow"}`}
                >
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="text-xs">{categoryLabel[item.category]} / {money(item.price)}</span>
                </button>
              );
            })}
          </div>
          <textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="現場備註、特殊車況、施工提醒" className="input min-h-[110px]" />
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black">現場拍照上傳</h2>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
              <button type="button" className={`rounded-lg px-3 py-2 text-sm font-bold ${photoPhase === "before" ? "bg-carcare-yellow" : "bg-white"}`} onClick={() => setPhotoPhase("before")}>施工前</button>
              <button type="button" className={`rounded-lg px-3 py-2 text-sm font-bold ${photoPhase === "after" ? "bg-carcare-yellow" : "bg-white"}`} onClick={() => setPhotoPhase("after")}>施工後</button>
            </div>
          </div>
          <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-carcare-yellow bg-yellow-50 text-center">
            <span className="text-2xl font-black">+</span>
            <span className="font-bold">拍照 / 上傳照片</span>
            <span className="text-xs text-neutral-500">手機會優先開啟相機</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <PhotoGrid title="施工前照片" photos={beforePhotos} onRemove={(url) => setBeforePhotos((current) => current.filter((item) => item !== url))} />
          <PhotoGrid title="施工後照片" photos={afterPhotos} onRemove={(url) => setAfterPhotos((current) => current.filter((item) => item !== url))} />
        </section>

        <section className="rounded-3xl bg-carcare-black p-5 text-white shadow-xl">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>施工項目小計 <strong className="block text-2xl text-carcare-yellow">{money(subtotal)}</strong></div>
            <label>訂金
              <input type="number" value={deposit} min={0} onChange={(event) => setDeposit(Number(event.target.value || 0))} className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-neutral-950" />
            </label>
            <div>最終應付
              <strong className="block text-4xl text-carcare-yellow">{money(total)}</strong>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" className="primary-btn text-lg" onClick={() => saveQuotation(false)} disabled={saving}>{saving ? "儲存中..." : "儲存單據"}</button>
            <button type="button" className="primary-btn text-lg" onClick={() => saveQuotation(true)} disabled={saving}>{saving ? "產生中..." : "儲存並匯出PDF"}</button>
          </div>
        </section>

        <section className="fixed left-[-9999px] top-0 w-[794px] bg-white p-8 text-neutral-950">
          <div id="mobile-order-pdf" className="space-y-5 bg-white p-6">
            <div className="flex items-center justify-between bg-carcare-black p-5 text-white">
              <div className="text-4xl font-black italic">PEI<span className="text-carcare-yellow">WAY</span></div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-white">汽車施工快速報價單</h2>
                <p className="text-white/70">{quoteNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 text-lg font-black">客戶車輛資訊</h3>
                <p>車主姓名：{customerName}</p>
                <p>聯絡電話：{customerPhone}</p>
                <p>車牌號碼：{plateNo}</p>
                <p>車廠品牌：{brand || "-"}</p>
                <p>車型規格：{carModel}</p>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 text-lg font-black">施工項目</h3>
                {selectedItems.map((item) => <p key={item.id}>{item.label} {money(item.price)}</p>)}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-lg font-black">備註</h3>
              <p>{remark || "-"}</p>
            </div>
            <div className="rounded-xl bg-carcare-yellow p-5 text-center text-4xl font-black">
              總合計金額 {money(total)}
            </div>
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

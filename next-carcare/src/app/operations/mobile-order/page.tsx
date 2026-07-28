"use client";

import { useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { ensureCustomerVehicleArchive } from "@/lib/customerArchive";
import { exportElementToPdf } from "@/lib/pdf";
import { supabase } from "@/lib/supabase";

type CarSearchRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
};

type QuickOption = {
  id: string;
  label: string;
  group: "base" | "carpet" | "seat" | "extra" | "gift";
  price: number;
};

const text = {
  title: "\u884c\u52d5\u5feb\u901f\u958b\u55ae",
  subtitle: "\u641c\u5c0b\u5ba2\u6236\u3001\u9078\u64c7\u65bd\u5de5\u9805\u76ee\u3001\u4e0a\u50b3\u7167\u7247\u3001\u5132\u5b58\u5831\u50f9\u4e26\u532f\u51fa PDF\u3002",
  back: "\u8fd4\u56de",
  customerVehicle: "\u5ba2\u6236\u8207\u8eca\u8f1b\u8cc7\u6599",
  searchPlaceholder: "\u641c\u5c0b\u96fb\u8a71\u6216\u8eca\u724c",
  search: "\u641c\u5c0b",
  apply: "\u5e36\u5165",
  unnamedCustomer: "\u672a\u547d\u540d\u5ba2\u6236",
  customerName: "\u8eca\u4e3b\u59d3\u540d",
  phone: "\u806f\u7d61\u96fb\u8a71",
  plate: "\u8eca\u724c\u865f\u78bc",
  brand: "\u8eca\u5ee0\u54c1\u724c",
  serviceItems: "\u65bd\u5de5\u9805\u76ee",
  remark: "\u73fe\u5834\u5099\u8a3b",
  photos: "\u65bd\u5de5\u7167\u7247",
  before: "\u65bd\u5de5\u524d",
  after: "\u65bd\u5de5\u5f8c",
  uploadPhoto: "\u62cd\u7167 / \u4e0a\u50b3\u7167\u7247",
  cameraHint: "\u624b\u6a5f\u6703\u512a\u5148\u958b\u555f\u76f8\u6a5f\u3002",
  remove: "\u522a\u9664",
  subtotal: "\u9805\u76ee\u5c0f\u8a08",
  deposit: "\u8a02\u91d1",
  total: "\u6700\u7d42\u61c9\u4ed8\u91d1\u984d",
  save: "\u5132\u5b58\u55ae\u64da",
  savePdf: "\u5132\u5b58\u4e26\u532f\u51faPDF",
  saving: "\u5132\u5b58\u4e2d...",
  generating: "\u7522\u751f\u4e2d...",
  required: "\u8acb\u586b\u5beb\u8eca\u4e3b\u59d3\u540d\u3001\u96fb\u8a71\u3001\u8eca\u724c\u8207\u8eca\u578b\u3002",
  chooseOne: "\u8acb\u81f3\u5c11\u9078\u64c7\u4e00\u500b\u65bd\u5de5\u9805\u76ee\u3002",
  saved: "\u884c\u52d5\u5feb\u901f\u55ae\u64da\u5df2\u5132\u5b58\uff0c\u53ef\u5728\u96fb\u8166\u5f8c\u53f0\u67e5\u770b\u3002",
  searchFailed: "\u641c\u5c0b\u5931\u6557",
  saveFailed: "\u5132\u5b58\u5931\u6557",
  unknown: "\u672a\u77e5\u932f\u8aa4",
  photoLimit: "\u6bcf\u500b\u5206\u985e\u6700\u591a\u53ea\u80fd\u4e0a\u50b3 8 \u5f35\u7167\u7247\u3002",
  bucketHint: "\u7167\u7247\u66ab\u5b58\u5728\u672c\u9801\u9810\u89bd\uff0c\u8acb\u78ba\u8a8d Supabase Storage \u5df2\u5efa\u7acb car-images bucket\u3002",
  pdfTitle: "\u884c\u52d5\u5feb\u901f\u5831\u50f9\u55ae",
  pdfCustomer: "\u5ba2\u6236\u8eca\u8f1b\u8cc7\u8a0a",
};

const carTypes = [
  "\u4e00\u822c5\u4eba\u5ea7\u8f4e\u8eca",
  "\u4e03\u4eba\u5ea72-3-2",
  "\u4e5d\u4eba\u5ea7\u5546\u52d9\u8eca",
];

const categoryOptions = [
  "\u57fa\u790e\u4fdd\u990a",
  "\u52a0\u8cfc",
  "\u8d08\u9001",
  "\u5916\u5305",
  "\u5176\u4ed6\u5099\u8a3b",
];

const groupLabels: Record<QuickOption["group"], string> = {
  base: "\u57fa\u790e\u4fdd\u990a",
  carpet: "\u5730\u6bef",
  seat: "\u5ea7\u6905",
  extra: "\u52a0\u8cfc",
  gift: "\u8d08\u9001",
};

const quickOptions: QuickOption[] = [
  { id: "base-9999", label: "9999\u5167\u5916\u8d85\u503c\u65b9\u6848", group: "base", price: 9999 },
  { id: "base-interior", label: "\u5167\u88dd\u6df1\u5c64\u6e05\u6f54", group: "base", price: 6800 },
  { id: "carpet-driver", label: "\u99d5\u99db\u5ea7\u5730\u6bef", group: "carpet", price: 600 },
  { id: "carpet-passenger", label: "\u526f\u99d5\u5730\u6bef", group: "carpet", price: 600 },
  { id: "carpet-left", label: "\u5de6\u534a\u908a\u5730\u6bef", group: "carpet", price: 600 },
  { id: "carpet-right", label: "\u53f3\u534a\u908a\u5730\u6bef", group: "carpet", price: 600 },
  { id: "carpet-all", label: "\u5168\u8eca\u5730\u6bef", group: "carpet", price: 2200 },
  { id: "seat-driver", label: "\u99d5\u99db\u5ea7\u6905", group: "seat", price: 800 },
  { id: "seat-passenger", label: "\u526f\u99d5\u5ea7\u6905", group: "seat", price: 800 },
  { id: "seat-rear", label: "\u5f8c\u6392\u5ea7\u6905", group: "seat", price: 1200 },
  { id: "seat-bench", label: "\u5f8c\u6392\u9023\u9ad4\u5ea7\u6905", group: "seat", price: 1600 },
  { id: "extra-smell", label: "\u7159\u5473/\u7570\u5473\u8655\u7406", group: "extra", price: 1500 },
  { id: "extra-pet", label: "\u5bf5\u7269\u6bdb\u9aee\u8655\u7406", group: "extra", price: 1200 },
  { id: "gift-coating", label: "\u8d08\u9001\u934d\u819c\u4fdd\u56fa", group: "gift", price: 0 },
];

function money(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

function getErrorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const detail = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [detail.message, detail.details, detail.hint, detail.code].filter(Boolean).map(String).join(" / ");
  }
  return String(error);
}

function PhotoGrid({ title, photos, onRemove }: { title: string; photos: string[]; onRemove: (url: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-neutral-700">{title}</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = photos[index];
          return (
            <div key={`${title}-${index}`} className="aspect-square overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
              {url ? (
                <div className="relative h-full w-full">
                  <button type="button" className="h-full w-full" onClick={() => window.open(url, "_blank")}>
                    <img src={url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                    onClick={() => onRemove(url)}
                  >
                    {text.remove}
                  </button>
                </div>
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

  function toggleOption(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function searchCustomer() {
    const keyword = searchKeyword.trim();
    if (!keyword) return;

    const { data, error } = await supabase
      .from("cars")
      .select("id,customer_name,customer_phone,plate_no,brand,model")
      .or(`plate_no.ilike.%${keyword}%,customer_phone.ilike.%${keyword}%`)
      .limit(8);

    if (error) {
      window.alert(`${text.searchFailed}：${error.message}`);
      return;
    }
    setResults((data || []) as CarSearchRow[]);
  }

  function applyCustomer(row: CarSearchRow) {
    setCustomerName(row.customer_name || "");
    setCustomerPhone(row.customer_phone || "");
    setPlateNo(row.plate_no || "");
    setBrand(row.brand || "");
    setCarModel(row.model || carTypes[0]);
    setResults([]);
  }

  async function uploadPhoto(file: File) {
    const currentPhotos = photoPhase === "before" ? beforePhotos : afterPhotos;
    if (currentPhotos.length >= 8) {
      window.alert(text.photoLimit);
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
      window.alert(text.bucketHint);
    }

    if (photoPhase === "before") setBeforePhotos((current) => [...current, url]);
    else setAfterPhotos((current) => [...current, url]);
  }

  async function saveQuotation(exportPdf = false) {
    if (!customerName.trim() || !customerPhone.trim() || !plateNo.trim() || !carModel.trim()) {
      window.alert(text.required);
      return;
    }
    if (!selectedItems.length) {
      window.alert(text.chooseOne);
      return;
    }

    setSaving(true);
    try {
      const profile = await getCurrentProfile();
      const nextQuoteNo = `Q${Date.now()}`;
      setQuoteNo(nextQuoteNo);

      let carId: string | null = null;
      if (profile) {
        try {
          carId = await ensureCustomerVehicleArchive(profile, {
            customer_name: customerName,
            customer_phone: customerPhone,
            plate_no: plateNo,
            brand,
            model: carModel,
          });
        } catch (archiveError) {
          console.warn("Mobile quick order archive skipped:", archiveError);
        }
      }

      const baseQuotation = {
        shop_id: profile?.shop_id || null,
        quote_no: nextQuoteNo,
        customer_name: customerName,
        customer_phone: customerPhone,
        plate_no: plateNo,
        total_amount: total,
        final_amount: total,
        status: "draft",
        remark,
      };

      const { data: quotation, error } = await supabase
        .from("quotations")
        .insert({
          ...baseQuotation,
          car_id: carId,
          brand,
          model: carModel,
          category: serviceCategory,
          deposit_amount: deposit,
          selected_area: {
            source: "mobile-order",
            selected_items: selectedItems,
            before_photos: beforePhotos,
            after_photos: afterPhotos,
          },
        })
        .select("id")
        .single();

      let quotationId = quotation?.id as string | undefined;
      if (error || !quotationId) {
        console.warn("Mobile quick order rich insert failed, retrying with base fields:", error);
        const fallback = await supabase.from("quotations").insert(baseQuotation).select("id").single();
        if (fallback.error || !fallback.data?.id) {
          throw new Error(getErrorMessage(fallback.error || error) || text.saveFailed);
        }
        quotationId = fallback.data.id as string;
      }

      const rows = selectedItems.map((item) => ({
        quotation_id: quotationId,
        shop_id: profile?.shop_id || null,
        service_item_id: null,
        item_name: item.label,
        category: groupLabels[item.group],
        qty: 1,
        unit_price: item.price,
        subtotal: item.price,
        remark: text.title,
      }));

      if (rows.length) {
        const { error: itemError } = await supabase.from("quotation_items").insert(rows);
        if (itemError) console.warn("Mobile quick order item insert skipped:", itemError);
      }

      window.alert(text.saved);
      if (exportPdf) await exportElementToPdf("mobile-order-pdf", `PEIWAY_mobile_quote_${plateNo || nextQuoteNo}.pdf`);
    } catch (error) {
      window.alert(`${text.saveFailed}：${getErrorMessage(error) || text.unknown}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth allow={["admin", "shop_manager", "vice_manager", "worker"]}>
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-28">
        <header className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-neutral-500">PEIWAY</p>
            <h1 className="text-2xl font-black text-neutral-950">{text.title}</h1>
            <p className="text-sm text-neutral-600">{text.subtitle}</p>
          </div>
          <button type="button" className="secondary-btn" onClick={() => window.history.back()}>
            {text.back}
          </button>
        </header>

        <section className="card space-y-4">
          <h2 className="text-lg font-black">{text.customerVehicle}</h2>
          <div className="flex gap-2">
            <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder={text.searchPlaceholder} className="input flex-1" />
            <button type="button" className="primary-btn min-w-[86px]" onClick={searchCustomer}>
              {text.search}
            </button>
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2">
              {results.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-carcare-yellow/20"
                  onClick={() => applyCustomer(row)}
                >
                  <span>
                    <strong>{row.customer_name || text.unnamedCustomer}</strong>
                    <span className="block text-xs text-neutral-500">
                      {row.plate_no || "-"} / {row.customer_phone || "-"}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-carcare-yellow">{text.apply}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={text.customerName} className="input" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder={text.phone} className="input" />
            <input value={plateNo} onChange={(event) => setPlateNo(event.target.value)} placeholder={text.plate} className="input" />
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder={text.brand} className="input" />
            <select value={carModel} onChange={(event) => setCarModel(event.target.value)} className="input sm:col-span-2">
              {carTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black">{text.serviceItems}</h2>
            <select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)} className="input sm:w-48">
              {categoryOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
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
                  className={`min-h-[74px] rounded-xl border px-3 py-3 text-left transition ${
                    active ? "border-carcare-yellow bg-carcare-yellow text-neutral-950" : "border-neutral-300 bg-white text-neutral-900 hover:border-carcare-yellow"
                  }`}
                >
                  <span className="block text-sm font-black">{item.label}</span>
                  <span className="text-xs">
                    {groupLabels[item.group]} / {money(item.price)}
                  </span>
                </button>
              );
            })}
          </div>
          <textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder={text.remark} className="input min-h-[110px]" />
        </section>

        <section className="card space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-black">{text.photos}</h2>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
              <button type="button" className={`rounded-lg px-3 py-2 text-sm font-bold ${photoPhase === "before" ? "bg-carcare-yellow" : "bg-white"}`} onClick={() => setPhotoPhase("before")}>
                {text.before}
              </button>
              <button type="button" className={`rounded-lg px-3 py-2 text-sm font-bold ${photoPhase === "after" ? "bg-carcare-yellow" : "bg-white"}`} onClick={() => setPhotoPhase("after")}>
                {text.after}
              </button>
            </div>
          </div>
          <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-carcare-yellow bg-yellow-50 text-center">
            <span className="text-2xl font-black">+</span>
            <span className="font-bold">{text.uploadPhoto}</span>
            <span className="text-xs text-neutral-500">{text.cameraHint}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <PhotoGrid title={`${text.before}${text.photos}`} photos={beforePhotos} onRemove={(url) => setBeforePhotos((current) => current.filter((item) => item !== url))} />
          <PhotoGrid title={`${text.after}${text.photos}`} photos={afterPhotos} onRemove={(url) => setAfterPhotos((current) => current.filter((item) => item !== url))} />
        </section>

        <section className="rounded-3xl bg-carcare-black p-5 text-white shadow-xl">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              {text.subtotal}
              <strong className="block text-2xl text-carcare-yellow">{money(subtotal)}</strong>
            </div>
            <label>
              {text.deposit}
              <input type="number" value={deposit} min={0} onChange={(event) => setDeposit(Number(event.target.value || 0))} className="mt-2 w-full rounded-xl border border-white/20 bg-white px-3 py-3 text-neutral-950" />
            </label>
            <div>
              {text.total}
              <strong className="block text-4xl text-carcare-yellow">{money(total)}</strong>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" className="primary-btn text-lg" onClick={() => saveQuotation(false)} disabled={saving}>
              {saving ? text.saving : text.save}
            </button>
            <button type="button" className="primary-btn text-lg" onClick={() => saveQuotation(true)} disabled={saving}>
              {saving ? text.generating : text.savePdf}
            </button>
          </div>
        </section>

        <section className="fixed left-[-9999px] top-0 w-[794px] bg-white p-8 text-neutral-950">
          <div id="mobile-order-pdf" className="space-y-5 bg-white p-6">
            <div className="flex items-center justify-between bg-carcare-black p-5 text-white">
              <div className="text-4xl font-black italic">
                PEI<span className="text-carcare-yellow">WAY</span>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-black text-white">{text.pdfTitle}</h2>
                <p className="text-white/70">{quoteNo}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 text-lg font-black">{text.pdfCustomer}</h3>
                <p>{text.customerName}：{customerName}</p>
                <p>{text.phone}：{customerPhone}</p>
                <p>{text.plate}：{plateNo}</p>
                <p>{text.brand}：{brand || "-"}</p>
                <p>{carModel}</p>
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="mb-2 text-lg font-black">{text.serviceItems}</h3>
                {selectedItems.map((item) => (
                  <p key={item.id}>
                    {item.label} {money(item.price)}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <h3 className="mb-2 text-lg font-black">{text.remark}</h3>
              <p>{remark || "-"}</p>
            </div>
            <div className="rounded-xl bg-carcare-yellow p-5 text-center text-4xl font-black">
              {text.total} {money(total)}
            </div>
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { ensureCustomerVehicleArchive } from "@/lib/customerArchive";
import { supabase } from "@/lib/supabase";

type CarSearchRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
};

type ServiceGroup = "base" | "addon" | "gift" | "outsource" | "note" | "carpet" | "seat";

type QuickItem = {
  id: string;
  label: string;
  group: ServiceGroup;
  defaultPrice: number;
};

type SelectedItem = QuickItem & {
  price: number;
};

const carTypes = ["一般5人座轎車", "七人座2-3-2", "九人座商務車"];

const groupLabels: Record<ServiceGroup, string> = {
  base: "基礎保養",
  addon: "加購",
  gift: "贈送",
  outsource: "外包",
  note: "其他備註",
  carpet: "地毯5區",
  seat: "座椅選項",
};

const mainItems: QuickItem[] = [
  { id: "base-9999", label: "9999內外超值方案", group: "base", defaultPrice: 9999 },
  { id: "base-interior", label: "內裝深層清潔", group: "base", defaultPrice: 6800 },
  { id: "addon-odor", label: "煙味/異味處理", group: "addon", defaultPrice: 1500 },
  { id: "addon-pet", label: "寵物毛髮處理", group: "addon", defaultPrice: 1200 },
  { id: "gift-coating", label: "贈送鍍膜保固", group: "gift", defaultPrice: 0 },
  { id: "outsource-polish", label: "外包拋光整理", group: "outsource", defaultPrice: 0 },
  { id: "note-custom", label: "其他現場備註", group: "note", defaultPrice: 0 },
];

const interiorItems: QuickItem[] = [
  { id: "carpet-driver", label: "駕駛座地毯", group: "carpet", defaultPrice: 600 },
  { id: "carpet-passenger", label: "副駕地毯", group: "carpet", defaultPrice: 600 },
  { id: "carpet-left", label: "左半邊地毯", group: "carpet", defaultPrice: 600 },
  { id: "carpet-right", label: "右半邊地毯", group: "carpet", defaultPrice: 600 },
  { id: "carpet-all", label: "全車地毯", group: "carpet", defaultPrice: 2200 },
  { id: "seat-driver", label: "駕駛座椅", group: "seat", defaultPrice: 800 },
  { id: "seat-passenger", label: "副駕座椅", group: "seat", defaultPrice: 800 },
  { id: "seat-rear", label: "後排座椅", group: "seat", defaultPrice: 1200 },
  { id: "seat-bench", label: "後排連體座椅", group: "seat", defaultPrice: 1600 },
];

function money(value: number) {
  return `$${Math.max(0, value).toLocaleString("en-US")}`;
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const detail = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    return [detail.message, detail.details, detail.hint, detail.code].filter(Boolean).map(String).join(" / ");
  }
  return String(error);
}

function Card({ children, title, desc }: { children: ReactNode; title: string; desc?: string }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
      <div className="mb-4">
        <h2 className="text-lg font-black text-neutral-950">{title}</h2>
        {desc ? <p className="mt-1 text-sm text-neutral-500">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function MobileOrderPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [results, setResults] = useState<CarSearchRow[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [brand, setBrand] = useState("");
  const [carModel, setCarModel] = useState(carTypes[0]);
  const [remark, setRemark] = useState("");
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({});
  const [deposit, setDeposit] = useState(0);
  const [interiorOpen, setInteriorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);
  const baseSubtotal = selectedItems.filter((item) => item.group === "base").reduce((sum, item) => sum + item.price, 0);
  const addonSubtotal = selectedItems.filter((item) => item.group === "addon").reduce((sum, item) => sum + item.price, 0);
  const giftSubtotal = selectedItems.filter((item) => item.group === "gift").reduce((sum, item) => sum + item.price, 0);
  const outsourceSubtotal = selectedItems.filter((item) => item.group === "outsource").reduce((sum, item) => sum + item.price, 0);
  const noteSubtotal = selectedItems.filter((item) => item.group === "note").reduce((sum, item) => sum + item.price, 0);
  const carpetSubtotal = selectedItems.filter((item) => item.group === "carpet").reduce((sum, item) => sum + item.price, 0);
  const seatSubtotal = selectedItems.filter((item) => item.group === "seat").reduce((sum, item) => sum + item.price, 0);
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - deposit);

  function toggleItem(item: QuickItem) {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = { ...item, price: item.defaultPrice };
      return next;
    });
  }

  function updateItemPrice(item: QuickItem, price: number) {
    setSelected((current) => ({
      ...current,
      [item.id]: { ...item, price: Math.max(0, price || 0) },
    }));
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
      window.alert(`搜尋失敗：${error.message}`);
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

  async function saveQuotation() {
    if (!customerName.trim() || !customerPhone.trim() || !plateNo.trim() || !carModel.trim()) {
      window.alert("請先填寫姓名、電話、車牌與車型。");
      return;
    }
    if (!selectedItems.length) {
      window.alert("請至少選擇一個施工項目。");
      return;
    }

    setSaving(true);
    try {
      const profile = await getCurrentProfile();
      const quoteNo = `Q${Date.now()}`;
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
          console.warn("Mobile order customer archive skipped:", archiveError);
        }
      }

      const baseQuotationPayload = {
        shop_id: profile?.shop_id || null,
        quote_no: quoteNo,
        customer_name: customerName,
        customer_phone: customerPhone,
        plate_no: plateNo,
        total_amount: total,
        final_amount: total,
        status: "draft",
        remark,
      };
      const quotationPayload = {
        ...baseQuotationPayload,
        car_id: carId,
        brand,
        model: carModel,
        deposit_amount: deposit,
        selected_area: {
          source: "mobile-order-card",
          subtotals: {
            base: baseSubtotal,
            addon: addonSubtotal,
            gift: giftSubtotal,
            outsource: outsourceSubtotal,
            note: noteSubtotal,
            carpet: carpetSubtotal,
            seat: seatSubtotal,
          },
          selected_items: selectedItems,
        },
      };

      const { data, error } = await supabase.from("quotations").insert(quotationPayload).select("id").single();
      let quotationId = data?.id as string | undefined;
      if (error || !quotationId) {
        console.warn("Mobile order rich quotation insert failed, retrying base fields:", error);
        const fallback = await supabase.from("quotations").insert(baseQuotationPayload).select("id").single();
        if (fallback.error || !fallback.data?.id) throw new Error(errorMessage(fallback.error || error) || "報價單建立失敗");
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
        remark: "行動快速開單",
      }));

      const { error: itemError } = await supabase.from("quotation_items").insert(rows);
      if (itemError) console.warn("Mobile order quotation_items insert skipped:", itemError);

      router.push(`/operations/quotations?quote=${quotationId}`);
    } catch (error) {
      window.alert(`儲存失敗：${errorMessage(error) || "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  }

  function renderItem(item: QuickItem) {
    const active = Boolean(selected[item.id]);
    return (
      <div key={item.id} className={`rounded-xl border p-3 transition duration-200 ${active ? "border-carcare-yellow bg-yellow-50" : "border-neutral-200 bg-white"}`}>
        <button type="button" onClick={() => toggleItem(item)} className="flex w-full items-center gap-3 text-left">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg border text-sm font-black ${active ? "border-carcare-yellow bg-carcare-yellow" : "border-neutral-300"}`}>
            {active ? "✓" : ""}
          </span>
          <span className="flex-1">
            <span className="block text-base font-black text-neutral-950">{item.label}</span>
            <span className="text-xs text-neutral-500">{groupLabels[item.group]}</span>
          </span>
        </button>
        {active ? (
          <label className="mt-3 block text-xs font-bold text-neutral-500">
            金額
            <input
              type="number"
              min={0}
              value={selected[item.id]?.price ?? item.defaultPrice}
              onChange={(event) => updateItemPrice(item, Number(event.target.value || 0))}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-3 text-base font-black text-neutral-950 outline-none transition duration-200 focus:border-carcare-yellow"
            />
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <RequireAuth allow={["admin", "shop_manager", "vice_manager"]}>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-28">
        <header className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
          <p className="text-xs font-black text-carcare-yellow">PEIWAY Mobile</p>
          <h1 className="text-2xl font-black text-neutral-950">行動快速開單</h1>
          <p className="mt-1 text-sm text-neutral-500">手機端卡片式流程：客戶、車輛、施工項目、車內清潔、金額與儲存。</p>
        </header>

        <Card title="客戶資訊" desc="可選既有客戶，也可快速新增現場客戶。">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-100 p-1">
            <button type="button" onClick={() => setMode("existing")} className={`rounded-lg px-3 py-3 text-sm font-black ${mode === "existing" ? "bg-carcare-yellow text-carcare-black" : "bg-white"}`}>
              選既有客戶
            </button>
            <button type="button" onClick={() => setMode("new")} className={`rounded-lg px-3 py-3 text-sm font-black ${mode === "new" ? "bg-carcare-yellow text-carcare-black" : "bg-white"}`}>
              快速新增客戶
            </button>
          </div>

          {mode === "existing" ? (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="輸入電話或車牌搜尋" className="min-h-[48px] flex-1 rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow" />
                <button type="button" onClick={searchCustomer} className="min-h-[48px] rounded-xl bg-carcare-yellow px-4 font-black text-carcare-black">
                  搜尋
                </button>
              </div>
              {results.length ? (
                <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-2">
                  {results.map((row) => (
                    <button key={row.id} type="button" onClick={() => applyCustomer(row)} className="w-full rounded-lg bg-white p-3 text-left shadow-sm transition duration-200 hover:ring-2 hover:ring-carcare-yellow">
                      <span className="block font-black">{row.customer_name || "未命名客戶"}</span>
                      <span className="text-sm text-neutral-500">{row.customer_phone || "-"} / {row.plate_no || "-"}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="姓名" className="min-h-[48px] rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow" />
            <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="電話" className="min-h-[48px] rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow" />
          </div>
        </Card>

        <Card title="車輛資訊">
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={plateNo} onChange={(event) => setPlateNo(event.target.value)} placeholder="車牌號碼" className="min-h-[48px] rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow" />
            <input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="品牌" className="min-h-[48px] rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow" />
            <select value={carModel} onChange={(event) => setCarModel(event.target.value)} className="min-h-[48px] rounded-xl border border-neutral-300 px-3 outline-none transition duration-200 focus:border-carcare-yellow sm:col-span-2">
              {carTypes.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card title="施工項目分類" desc="勾選項目後可直接調整金額。">
          <div className="space-y-4">
            {(["base", "addon", "gift", "outsource", "note"] as ServiceGroup[]).map((group) => (
              <div key={group}>
                <h3 className="mb-2 text-sm font-black text-neutral-700">{groupLabels[group]}</h3>
                <div className="grid gap-2 sm:grid-cols-2">{mainItems.filter((item) => item.group === group).map(renderItem)}</div>
              </div>
            ))}
            <textarea value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="其他施工備註" className="min-h-[96px] w-full rounded-xl border border-neutral-300 px-3 py-3 outline-none transition duration-200 focus:border-carcare-yellow" />
          </div>
        </Card>

        <Card title="車內清潔選項" desc="需要地毯或座椅時再展開，手機畫面會比較乾淨。">
          <button type="button" onClick={() => setInteriorOpen((value) => !value)} className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-neutral-300 px-4 font-black transition duration-200 hover:border-carcare-yellow">
            {interiorOpen ? "收合地毯 / 座椅選項" : "展開地毯 / 座椅選項"}
            <span>{interiorOpen ? "−" : "+"}</span>
          </button>
          {interiorOpen ? (
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-black text-neutral-700">地毯5區</h3>
                <div className="grid gap-2 sm:grid-cols-2">{interiorItems.filter((item) => item.group === "carpet").map(renderItem)}</div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-neutral-700">座椅選項</h3>
                <div className="grid gap-2 sm:grid-cols-2">{interiorItems.filter((item) => item.group === "seat").map(renderItem)}</div>
              </div>
            </div>
          ) : null}
        </Card>

        <Card title="金額合計">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">施工項目小計</p>
              <p className="text-2xl font-black text-carcare-yellow">{money(baseSubtotal + addonSubtotal + giftSubtotal + outsourceSubtotal + noteSubtotal)}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500">車內清潔小計</p>
              <p className="text-2xl font-black text-carcare-yellow">{money(carpetSubtotal + seatSubtotal)}</p>
            </div>
            <label className="rounded-xl bg-neutral-50 p-3">
              <span className="text-xs text-neutral-500">訂金</span>
              <input type="number" min={0} value={deposit} onChange={(event) => setDeposit(Number(event.target.value || 0))} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-black outline-none focus:border-carcare-yellow" />
            </label>
          </div>
          <div className="mt-3 rounded-xl bg-carcare-black p-4 text-white">
            <p className="text-sm text-white/70">總金額</p>
            <p className="text-4xl font-black text-carcare-yellow">{money(total)}</p>
          </div>
        </Card>

        <Card title="動作">
          <button type="button" onClick={saveQuotation} disabled={saving} className="min-h-[56px] w-full rounded-xl bg-carcare-yellow px-4 text-lg font-black text-carcare-black transition duration-200 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "儲存中..." : "儲存建立報價單"}
          </button>
          <p className="mt-3 text-xs text-neutral-500">儲存完成會跳轉至標準報價單頁，可繼續編輯、匯出 PDF，並沿用原本 N8N / Google Sheets 同步流程。</p>
        </Card>
      </main>
    </RequireAuth>
  );
}

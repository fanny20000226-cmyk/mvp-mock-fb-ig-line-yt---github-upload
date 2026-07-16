"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listServiceItems } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  base_price: number;
  active: boolean;
};

type ParsedForm = {
  customer_name: string;
  customer_phone: string;
  plate_no: string;
  brand: string;
  model: string;
  year: string;
  service_name: string;
  store_name: string;
  appointment_at: string;
  source: string;
  note: string;
  amount: string;
};

const emptyForm: ParsedForm = {
  customer_name: "",
  customer_phone: "",
  plate_no: "",
  brand: "",
  model: "",
  year: "",
  service_name: "",
  store_name: "",
  appointment_at: "",
  source: "",
  note: "",
  amount: ""
};

const templateText = `🔴【預約資料填寫】

1️⃣ 稱呼：
2️⃣ 聯絡電話：
3️⃣ 車牌：
4️⃣ 車型：
5️⃣ 年份：
6️⃣ 預約方案：
7️⃣ 預約門市：
8️⃣ 預約日期 / 時間：
9️⃣ 如何得知我們（FB / IG / Google / 朋友介紹）：
➡️其它備註：`;

function pickValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const normalizedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`${normalizedLabel}\\s*[：:]\\s*(.*)$`, "i");
    const found = lines.find((line) => pattern.test(line));
    if (found) return found.replace(pattern, "$1").trim();
  }
  return "";
}

function splitCarModel(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return { brand: "", model: "" };
  const [brand, ...rest] = cleaned.split(/\s+/);
  return { brand, model: rest.join(" ") || cleaned };
}

function parseReservation(text: string): ParsedForm {
  const carText = pickValue(text, ["車型"]);
  const car = splitCarModel(carText);
  return {
    customer_name: pickValue(text, ["稱呼"]),
    customer_phone: pickValue(text, ["聯絡電話", "電話"]),
    plate_no: pickValue(text, ["車牌"]),
    brand: car.brand,
    model: car.model,
    year: pickValue(text, ["年份"]),
    service_name: pickValue(text, ["預約方案", "預約方案項目"]),
    store_name: pickValue(text, ["預約門市", "預約的分店"]),
    appointment_at: pickValue(text, ["預約日期 / 時間", "預約的日期/時間", "預約日期"]),
    source: pickValue(text, ["如何得知我們（FB / IG / Google / 朋友介紹）", "如何得知我們的(FB/IG/TK/GOOGLE/朋友)", "如何得知我們"]),
    note: pickValue(text, ["➡️其它備註", "其它備註", "車輛其他問題備注", "備註"]),
    amount: ""
  };
}

export default function PasteReservationPage() {
  const [pasteText, setPasteText] = useState(templateText);
  const [form, setForm] = useState<ParsedForm>(emptyForm);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [createdOrderNo, setCreatedOrderNo] = useState("");

  const matchedService = useMemo(() => {
    if (!form.service_name) return null;
    return services.find((item) => form.service_name.includes(item.name) || item.name.includes(form.service_name));
  }, [form.service_name, services]);

  useEffect(() => {
    async function loadServices() {
      const { data } = await listServiceItems();
      setServices(((data || []) as ServiceRow[]).filter((item) => item.active));
    }
    loadServices();
  }, []);

  useEffect(() => {
    if (!matchedService) return;
    setForm((current) => ({
      ...current,
      amount: current.amount || String(Number(matchedService.base_price || 0)),
      service_name: current.service_name || matchedService.name
    }));
  }, [matchedService]);

  function parseNow() {
    const parsed = parseReservation(pasteText);
    const service = services.find((item) => parsed.service_name.includes(item.name) || item.name.includes(parsed.service_name));
    setForm({
      ...parsed,
      amount: service ? String(Number(service.base_price || 0)) : parsed.amount
    });
    setCreatedOrderNo("");
  }

  async function submitReservation() {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    if (!form.customer_name || !form.customer_phone || !form.plate_no) {
      return alert("請至少填寫稱呼、電話與車牌。");
    }

    setSaving(true);

    const carRows = await supabase
      .from("cars")
      .select("id")
      .eq("shop_id", profile.shop_id)
      .eq("plate_no", form.plate_no)
      .limit(1);

    let carId = carRows.data?.[0]?.id as string | undefined;
    const carPayload = {
      shop_id: profile.shop_id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      plate_no: form.plate_no,
      brand: form.brand,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      updated_at: new Date().toISOString()
    };

    if (carId) {
      const { error } = await supabase.from("cars").update(carPayload).eq("id", carId);
      if (error) {
        setSaving(false);
        return alert(error.message);
      }
    } else {
      const { data, error } = await supabase.from("cars").insert(carPayload).select("id").single();
      if (error || !data) {
        setSaving(false);
        return alert(error?.message || "建立車輛資料失敗。");
      }
      carId = data.id as string;
    }

    const amount = Number(form.amount || matchedService?.base_price || 0);
    const noteLines = [
      form.note ? `備註：${form.note}` : "",
      form.store_name ? `預約門市：${form.store_name}` : "",
      form.appointment_at ? `預約時間：${form.appointment_at}` : "",
      form.source ? `得知管道：${form.source}` : ""
    ].filter(Boolean);

    const { data: quoteData, error: quoteError } = await supabase
      .from("quotations")
      .insert({
        shop_id: profile.shop_id,
        created_by: profile.id,
        quote_no: `Q${Date.now()}`,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        plate_no: form.plate_no,
        total_amount: amount,
        final_amount: amount,
        status: "pending",
        remark: noteLines.join("\n")
      })
      .select("id")
      .single();

    if (quoteError || !quoteData) {
      setSaving(false);
      return alert(quoteError?.message || "建立報價失敗。");
    }

    await supabase.from("quotation_items").insert({
      shop_id: profile.shop_id,
      quotation_id: quoteData.id,
      item_name: form.service_name || matchedService?.name || "現場預約方案",
      category: matchedService?.category || "現場預約",
      quantity: 1,
      unit_price: amount,
      subtotal: amount
    });

    const orderNo = `O${Date.now()}`;
    const { error: orderError } = await supabase.from("construction_orders").insert({
      shop_id: profile.shop_id,
      car_id: carId,
      quotation_id: quoteData.id,
      order_no: orderNo,
      status: "pending",
      total_amount: amount,
      paid_amount: 0,
      remark: noteLines.join("\n"),
      created_by: profile.id
    });

    setSaving(false);
    if (orderError) return alert(orderError.message);
    setCreatedOrderNo(orderNo);
    alert("已建立預約、報價與訂單。");
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">前台預約</p>
              <h1 className="text-2xl font-black">貼上填單</h1>
              <p className="mt-1 text-sm text-neutral-500">
                把客戶回傳的預約資料整段貼上，系統會自動帶入欄位並建立訂單。
              </p>
            </div>
            <button type="button" onClick={parseNow} className="primary-btn">
              解析貼上內容
            </button>
          </div>

          <textarea
            className="form-input min-h-72 font-mono text-sm"
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
          />
        </section>

        <section className="card">
          <div className="mb-4">
            <p className="text-sm font-black text-carcare-yellow">預約內容</p>
            <h2 className="text-xl font-black">確認後送出</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="form-input" placeholder="稱呼" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input className="form-input" placeholder="聯絡電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            <input className="form-input" placeholder="車牌" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
            <input className="form-input" placeholder="品牌，例如 Tesla" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <input className="form-input" placeholder="車型，例如 Model Y" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <input className="form-input" placeholder="年份" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
            <select className="form-input" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value, amount: "" })}>
              <option value="">選擇預約方案</option>
              {services.map((service) => (
                <option key={service.id} value={service.name}>
                  {service.name} / ${Number(service.base_price || 0).toLocaleString()}
                </option>
              ))}
              {form.service_name && !matchedService ? <option value={form.service_name}>{form.service_name}</option> : null}
            </select>
            <input className="form-input" placeholder="預約門市" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })} />
            <input className="form-input" placeholder="預約日期 / 時間" value={form.appointment_at} onChange={(e) => setForm({ ...form, appointment_at: e.target.value })} />
            <input className="form-input" placeholder="如何得知我們" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            <input className="form-input" placeholder="金額" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <textarea className="form-input md:col-span-3" placeholder="其它備註" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={submitReservation} disabled={saving} className="primary-btn">
              {saving ? "建立中..." : "送出並建立訂單"}
            </button>
            {createdOrderNo ? (
              <>
                <span className="rounded-full bg-carcare-yellow px-4 py-2 text-sm font-black text-carcare-black">
                  已建立 {createdOrderNo}
                </span>
                <Link href="/operations/orders" className="secondary-btn">
                  前往訂單管理
                </Link>
              </>
            ) : null}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

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

type EvaluationForm = {
  customer_name: string;
  car_model: string;
  plate_no: string;
  customer_phone: string;
  appointment_at: string;
  store_name: string;
  service_name: string;
  budget: string;
  concern: string;
  job: string;
  source: string;
  vehicle_note: string;
};

const emptyForm: EvaluationForm = {
  customer_name: "",
  car_model: "",
  plate_no: "",
  customer_phone: "",
  appointment_at: "",
  store_name: "",
  service_name: "",
  budget: "",
  concern: "",
  job: "",
  source: "",
  vehicle_note: ""
};

const templateText = `1.稱呼：
2.車型：
3.車牌：
4.電話：
5.預約的日期/時間：
6.預約的分店(台北/桃園/台中/高雄）：
7.預約方案項目：
8.預算：
9.最在意愛車的地方是？：
10.職業：
11.如何得知我們的(FB/IG/TK/GOOGLE/朋友)：
12.車輛其他問題備注：`;

const stores = ["台北", "桃園", "台中", "高雄", "三重", "新竹", "台南"];
const sources = ["FB", "IG", "TK", "GOOGLE", "朋友", "其他"];

function pickValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^(?:\\d+[.、）)]\\s*)?${escaped}\\s*[：:]\\s*(.*)$`, "i");
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

function parseEvaluation(text: string): EvaluationForm {
  return {
    customer_name: pickValue(text, ["稱呼"]),
    car_model: pickValue(text, ["車型"]),
    plate_no: pickValue(text, ["車牌"]),
    customer_phone: pickValue(text, ["電話", "聯絡電話"]),
    appointment_at: pickValue(text, ["預約的日期/時間", "預約日期 / 時間", "預約日期"]),
    store_name: pickValue(text, ["預約的分店(台北/桃園/台中/高雄）", "預約的分店(台北/桃園/台中/高雄)", "預約的分店", "預約門市"]),
    service_name: pickValue(text, ["預約方案項目", "預約方案"]),
    budget: pickValue(text, ["預算"]),
    concern: pickValue(text, ["最在意愛車的地方是？", "最在意愛車的地方是", "最在意"]),
    job: pickValue(text, ["職業"]),
    source: pickValue(text, ["如何得知我們的(FB/IG/TK/GOOGLE/朋友)", "如何得知我們", "得知管道"]),
    vehicle_note: pickValue(text, ["車輛其他問題備注", "車輛其他問題備註", "其它備註", "備註"])
  };
}

function buildRemark(form: EvaluationForm) {
  return [
    form.appointment_at ? `預約時間：${form.appointment_at}` : "",
    form.store_name ? `預約分店：${form.store_name}` : "",
    form.budget ? `預算：${form.budget}` : "",
    form.concern ? `最在意：${form.concern}` : "",
    form.job ? `職業：${form.job}` : "",
    form.source ? `得知管道：${form.source}` : "",
    form.vehicle_note ? `車輛問題備註：${form.vehicle_note}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

export default function EvaluationPage() {
  const [pasteText, setPasteText] = useState(templateText);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [createdQuoteNo, setCreatedQuoteNo] = useState("");
  const [createdOrderNo, setCreatedOrderNo] = useState("");

  const matchedService = useMemo(() => {
    if (!form.service_name) return null;
    return services.find((item) => form.service_name.includes(item.name) || item.name.includes(form.service_name));
  }, [form.service_name, services]);

  const amount = useMemo(() => {
    const budgetNumber = Number(String(form.budget).replace(/[^\d.]/g, ""));
    return Number(matchedService?.base_price || budgetNumber || 0);
  }, [form.budget, matchedService]);

  useEffect(() => {
    async function loadServices() {
      const { data } = await listServiceItems();
      setServices(((data || []) as ServiceRow[]).filter((item) => item.active));
    }
    loadServices();
  }, []);

  function parseNow() {
    setForm(parseEvaluation(pasteText));
    setCreatedQuoteNo("");
    setCreatedOrderNo("");
  }

  async function ensureCar(profileShopId: string) {
    const car = splitCarModel(form.car_model);
    const existing = await supabase
      .from("cars")
      .select("id")
      .eq("shop_id", profileShopId)
      .eq("plate_no", form.plate_no)
      .limit(1);

    const payload = {
      shop_id: profileShopId,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      plate_no: form.plate_no,
      brand: car.brand,
      model: car.model,
      updated_at: new Date().toISOString()
    };

    const id = existing.data?.[0]?.id as string | undefined;
    if (id) {
      const { error } = await supabase.from("cars").update(payload).eq("id", id);
      if (error) throw error;
      return id;
    }

    const { data, error } = await supabase.from("cars").insert(payload).select("id").single();
    if (error || !data) throw error || new Error("建立車輛資料失敗");
    return data.id as string;
  }

  async function createQuote(createOrder: boolean) {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    if (!form.customer_name || !form.customer_phone || !form.plate_no) {
      return alert("請至少填寫稱呼、電話與車牌。");
    }

    setSaving(true);
    try {
      const carId = await ensureCar(profile.shop_id);
      const quoteNo = `E${Date.now()}`;
      const { data: quoteData, error: quoteError } = await supabase
        .from("quotations")
        .insert({
          shop_id: profile.shop_id,
          created_by: profile.id,
          quote_no: quoteNo,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          plate_no: form.plate_no,
          total_amount: amount,
          final_amount: amount,
          status: createOrder ? "confirmed" : "pending",
          remark: buildRemark(form)
        })
        .select("id")
        .single();

      if (quoteError || !quoteData) throw quoteError || new Error("建立評估報價失敗");

      await supabase.from("quotation_items").insert({
        shop_id: profile.shop_id,
        quotation_id: quoteData.id,
        item_name: form.service_name || matchedService?.name || "預約評估方案",
        category: matchedService?.category || "預約評估",
        quantity: 1,
        unit_price: amount,
        subtotal: amount
      });

      setCreatedQuoteNo(quoteNo);

      if (createOrder) {
        const orderNo = `O${Date.now()}`;
        const { error: orderError } = await supabase.from("construction_orders").insert({
          shop_id: profile.shop_id,
          car_id: carId,
          quotation_id: quoteData.id,
          order_no: orderNo,
          status: "pending",
          total_amount: amount,
          paid_amount: 0,
          remark: buildRemark(form),
          created_by: profile.id
        });
        if (orderError) throw orderError;
        setCreatedOrderNo(orderNo);
      }

      alert(createOrder ? "已建立評估報價與訂單。" : "已建立評估報價。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">預約評估</p>
              <h1 className="text-2xl font-black">12 欄評估表</h1>
              <p className="mt-1 text-sm text-neutral-500">
                客戶資料可整段複製貼上，自動整理為評估報價，也能直接建立訂單。
              </p>
            </div>
            <button type="button" onClick={parseNow} className="primary-btn">
              解析評估資料
            </button>
          </div>

          <textarea
            className="form-input min-h-64 font-mono text-sm"
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
          />
        </section>

        <section className="card">
          <div className="mb-4">
            <p className="text-sm font-black text-carcare-yellow">評估欄位</p>
            <h2 className="text-xl font-black">確認與補充資料</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="form-input" placeholder="1. 稱呼" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input className="form-input" placeholder="2. 車型" value={form.car_model} onChange={(e) => setForm({ ...form, car_model: e.target.value })} />
            <input className="form-input" placeholder="3. 車牌" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
            <input className="form-input" placeholder="4. 電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            <input className="form-input" placeholder="5. 預約日期 / 時間" value={form.appointment_at} onChange={(e) => setForm({ ...form, appointment_at: e.target.value })} />
            <select className="form-input" value={form.store_name} onChange={(e) => setForm({ ...form, store_name: e.target.value })}>
              <option value="">6. 選擇分店</option>
              {stores.map((store) => (
                <option key={store} value={store}>{store}</option>
              ))}
              {form.store_name && !stores.includes(form.store_name) ? <option value={form.store_name}>{form.store_name}</option> : null}
            </select>
            <select className="form-input" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })}>
              <option value="">7. 選擇預約方案項目</option>
              {services.map((service) => (
                <option key={service.id} value={service.name}>
                  {service.name} / ${Number(service.base_price || 0).toLocaleString()}
                </option>
              ))}
              {form.service_name && !matchedService ? <option value={form.service_name}>{form.service_name}</option> : null}
            </select>
            <input className="form-input" placeholder="8. 預算" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            <input className="form-input" placeholder="9. 最在意愛車的地方是？" value={form.concern} onChange={(e) => setForm({ ...form, concern: e.target.value })} />
            <input className="form-input" placeholder="10. 職業" value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />
            <select className="form-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="">11. 如何得知我們</option>
              {sources.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
              {form.source && !sources.includes(form.source) ? <option value={form.source}>{form.source}</option> : null}
            </select>
            <textarea className="form-input md:col-span-2" placeholder="12. 車輛其他問題備注" value={form.vehicle_note} onChange={(e) => setForm({ ...form, vehicle_note: e.target.value })} />
          </div>

          <div className="mt-5 rounded-2xl bg-carcare-black p-5 text-white">
            <p className="text-sm text-white/60">預估報價</p>
            <p className="mt-1 text-3xl font-black text-carcare-yellow">
              ${amount.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-white/60">
              會依後台服務價目或預算欄位自動帶入，可先儲存成評估報價，再決定是否建立訂單。
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => createQuote(false)} disabled={saving} className="secondary-btn">
              {saving ? "儲存中..." : "儲存評估報價"}
            </button>
            <button type="button" onClick={() => createQuote(true)} disabled={saving} className="primary-btn">
              {saving ? "建立中..." : "建立報價並轉訂單"}
            </button>
            {createdQuoteNo ? (
              <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-black text-neutral-700">
                報價 {createdQuoteNo}
              </span>
            ) : null}
            {createdOrderNo ? (
              <>
                <span className="rounded-full bg-carcare-yellow px-4 py-2 text-sm font-black text-carcare-black">
                  訂單 {createdOrderNo}
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

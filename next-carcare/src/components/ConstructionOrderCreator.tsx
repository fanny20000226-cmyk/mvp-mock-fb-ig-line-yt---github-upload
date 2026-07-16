"use client";

import { useEffect, useState } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { listCars, listQuotations } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type CarRow = {
  id: string;
  customer_name: string;
  plate_no: string | null;
};

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  plate_no: string | null;
  final_amount: number;
  total_amount: number;
};

export default function ConstructionOrderCreator({ onCreated }: { onCreated: () => void }) {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    car_id: "",
    quotation_id: "",
    service_note: "",
    total_amount: "",
    paid_amount: ""
  });

  useEffect(() => {
    async function load() {
      const [{ data: carData }, { data: quoteData }] = await Promise.all([
        listCars(),
        listQuotations()
      ]);
      setCars((carData || []) as CarRow[]);
      setQuotes((quoteData || []) as QuoteRow[]);
    }
    load();
  }, []);

  useEffect(() => {
    const quote = quotes.find((item) => item.id === form.quotation_id);
    if (!quote) return;
    setForm((current) => ({
      ...current,
      total_amount: String(Number(quote.final_amount || quote.total_amount || 0))
    }));
  }, [form.quotation_id, quotes]);

  async function createOrder() {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請重新登入。");
    if (!form.car_id) return alert("請先選擇車輛。");

    setSaving(true);
    const { error } = await supabase.from("construction_orders").insert({
      shop_id: profile.shop_id,
      car_id: form.car_id,
      quotation_id: form.quotation_id || null,
      order_no: `W${Date.now()}`,
      status: "pending",
      total_amount: Number(form.total_amount || 0),
      paid_amount: Number(form.paid_amount || 0),
      remark: form.service_note,
      created_by: profile.id
    });
    setSaving(false);
    if (error) return alert(error.message);
    setForm({ car_id: "", quotation_id: "", service_note: "", total_amount: "", paid_amount: "" });
    onCreated();
  }

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4">
        <p className="text-sm font-black text-carcare-yellow">施工開單</p>
        <h2 className="text-xl font-black">建立施工單</h2>
        <p className="mt-1 text-sm text-neutral-500">
          可綁定車輛與報價單，建立後會寫入施工訂單列表。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="form-input"
          value={form.car_id}
          onChange={(e) => setForm({ ...form, car_id: e.target.value })}
        >
          <option value="">選擇車輛</option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.customer_name} / {car.plate_no || "未填車牌"}
            </option>
          ))}
        </select>
        <select
          className="form-input"
          value={form.quotation_id}
          onChange={(e) => setForm({ ...form, quotation_id: e.target.value })}
        >
          <option value="">選擇報價單，可不選</option>
          {quotes.map((quote) => (
            <option key={quote.id} value={quote.id}>
              {quote.quote_no} / {quote.customer_name || quote.plate_no || "未命名"}
            </option>
          ))}
        </select>
        <input
          className="form-input"
          value={form.total_amount}
          onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
          placeholder="施工總金額"
        />
        <input
          className="form-input"
          value={form.paid_amount}
          onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
          placeholder="已收金額"
        />
        <textarea
          className="form-input md:col-span-2"
          value={form.service_note}
          onChange={(e) => setForm({ ...form, service_note: e.target.value })}
          placeholder="施工項目、注意事項、車況備註"
        />
      </div>
      <button type="button" onClick={createOrder} disabled={saving} className="primary-btn mt-4">
        {saving ? "建立中..." : "建立施工單"}
      </button>
    </section>
  );
}

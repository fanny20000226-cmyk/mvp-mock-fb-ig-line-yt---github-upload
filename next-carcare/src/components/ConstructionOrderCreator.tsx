"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { listCars, listQuotations } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type CarRow = {
  id: string;
  customer_name: string | null;
  customer_phone?: string | null;
  plate_no: string | null;
  license_plate?: string | null;
};

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  final_amount: number | null;
  total_amount: number | null;
  status: string | null;
};

type StaffRow = {
  employee_no: string;
  name: string;
  position: string | null;
  resigned: boolean;
};

const emptyForm = {
  car_id: "",
  quotation_id: "",
  responsible_staff_id: "",
  service_note: "",
  total_amount: "",
  paid_amount: "",
};

function normalizePlate(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function quoteAmount(quote?: QuoteRow | null) {
  return Number(quote?.final_amount || quote?.total_amount || 0);
}

export default function ConstructionOrderCreator({ onCreated }: { onCreated: () => void }) {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadOptions = useCallback(async () => {
    const [{ data: carData }, { data: quoteData }, { data: staffData }] = await Promise.all([
      listCars(),
      listQuotations(),
      supabase
        .from("staff_info")
        .select("employee_no, name, position, resigned")
        .eq("resigned", false)
        .order("name"),
    ]);

    setCars((carData || []) as CarRow[]);
    setQuotes(((quoteData || []) as QuoteRow[]).filter((quote) => quote.status !== "converted"));
    setStaffRows((staffData || []) as StaffRow[]);
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const selectedQuote = useMemo(
    () => quotes.find((item) => item.id === form.quotation_id) || null,
    [form.quotation_id, quotes]
  );

  const matchedQuoteCar = useMemo(() => {
    if (!selectedQuote?.plate_no) return null;
    const quotePlate = normalizePlate(selectedQuote.plate_no);
    return cars.find((car) => normalizePlate(car.plate_no || car.license_plate) === quotePlate) || null;
  }, [cars, selectedQuote]);

  useEffect(() => {
    if (!selectedQuote) return;

    setForm((current) => ({
      ...current,
      car_id: matchedQuoteCar?.id || "",
      total_amount: String(quoteAmount(selectedQuote)),
    }));
  }, [matchedQuoteCar, selectedQuote]);

  async function convertSelectedQuote() {
    const quote = selectedQuote || quotes.find((item) => item.id === form.quotation_id);
    if (!quote) throw new Error("請先選擇要轉成施工單的報價單。");
    if (!quote.plate_no?.trim()) throw new Error("這張報價單沒有車牌，請先回報價單補上車牌。");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("登入狀態已失效，請重新登入後再轉工單。");

    const response = await fetch("/api/operations/convert-quote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        quoteId: quote.id,
        responsibleStaffId: form.responsible_staff_id || undefined,
        paidAmount: Number(form.paid_amount || 0),
        totalAmount: Number(form.total_amount || quoteAmount(quote)),
        serviceNote: form.service_note,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) throw new Error(result.message || "轉工單失敗，請確認報價單、車輛與門市資料是否完整。");
  }

  async function createManualOrder() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) throw new Error("目前帳號尚未綁定門市，無法建立施工單。");
    if (!form.car_id) throw new Error("請先選擇車輛；若是從報價轉工單，請改選右側的報價單。");

    const { error } = await supabase.from("construction_orders").insert({
      shop_id: profile.shop_id,
      store_id: profile.shop_id,
      car_id: form.car_id,
      quotation_id: null,
      order_no: `W${Date.now()}`,
      status: "pending",
      total_amount: Number(form.total_amount || 0),
      paid_amount: Number(form.paid_amount || 0),
      responsible_staff_id: form.responsible_staff_id || null,
      remark: form.service_note,
      created_by: profile.id,
    });

    if (error) throw error;
  }

  async function createOrder() {
    if (saving) return;
    setSaving(true);

    try {
      if (selectedQuote || form.quotation_id) await convertSelectedQuote();
      else await createManualOrder();

      setForm(emptyForm);
      await loadOptions();
      onCreated();
      alert("施工單已建立，工作台與施工訂單列表會同步更新。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "建立施工單失敗。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4">
        <p className="text-sm font-black text-carcare-yellow">施工開單</p>
        <h2 className="text-xl font-black">建立施工單</h2>
        <p className="mt-1 text-sm text-neutral-500">
          可選擇既有車輛手動建立，或選擇報價單自動歸檔客戶與車輛後轉成施工單。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <select
          className="form-input"
          value={selectedQuote ? matchedQuoteCar?.id || "" : form.car_id}
          onChange={(event) => setForm({ ...form, car_id: event.target.value })}
          disabled={Boolean(selectedQuote)}
        >
          <option value="">
            {selectedQuote ? "報價轉工單會自動建立/綁定車輛" : "選擇車輛"}
          </option>
          {cars.map((car) => (
            <option key={car.id} value={car.id}>
              {car.customer_name || "未命名客戶"} / {car.plate_no || car.license_plate || "未填車牌"}
            </option>
          ))}
        </select>

        <select
          className="form-input"
          value={form.quotation_id}
          onChange={(event) => setForm({ ...form, quotation_id: event.target.value })}
        >
          <option value="">選擇報價單</option>
          {quotes.map((quote) => (
            <option key={quote.id} value={quote.id}>
              {quote.quote_no} / {quote.customer_name || quote.plate_no || "未命名客戶"}
            </option>
          ))}
        </select>

        <select
          className="form-input"
          value={form.responsible_staff_id}
          onChange={(event) => setForm({ ...form, responsible_staff_id: event.target.value })}
        >
          <option value="">選擇負責技師</option>
          {staffRows.map((staff) => (
            <option key={staff.employee_no} value={staff.employee_no}>
              {staff.name} / {staff.employee_no}
            </option>
          ))}
        </select>

        <input
          className="form-input"
          value={form.total_amount}
          onChange={(event) => setForm({ ...form, total_amount: event.target.value })}
          placeholder="施工總額"
          inputMode="numeric"
        />
        <input
          className="form-input"
          value={form.paid_amount}
          onChange={(event) => setForm({ ...form, paid_amount: event.target.value })}
          placeholder="已收金額"
          inputMode="numeric"
        />
        <textarea
          className="form-input md:col-span-2"
          value={form.service_note}
          onChange={(event) => setForm({ ...form, service_note: event.target.value })}
          placeholder="施工項目、注意事項、車況備註"
        />
      </div>

      {selectedQuote ? (
        <p className="mt-3 rounded-xl border border-carcare-yellow/40 bg-carcare-yellow/10 px-3 py-2 text-sm text-carcare-black">
          已選報價單 {selectedQuote.quote_no}，建立時會自動用車牌「{selectedQuote.plate_no || "未填車牌"}」
          綁定或建立車輛資料，再轉入施工訂單。
        </p>
      ) : null}

      <button type="button" onClick={createOrder} disabled={saving} className="primary-btn mt-4">
        {saving ? "建立中..." : "建立施工單"}
      </button>
    </section>
  );
}

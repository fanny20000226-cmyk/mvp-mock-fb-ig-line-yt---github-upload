"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import InteriorQuoteBuilder, { type QuoteDraft } from "@/components/InteriorQuoteBuilder";
import PdfExportButton from "@/components/PdfExportButton";
import { getCurrentProfile } from "@/lib/auth";
import { listQuotations, listServiceItems } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number;
  final_amount: number;
  status: string;
  created_at: string;
};

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  base_price: number;
  active: boolean;
};

const statusText: Record<string, string> = {
  pending: "待客戶確認",
  confirmed: "已確認",
  converted: "已轉工單",
  void: "作廢"
};

export default function QuotationsPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    plate_no: "",
    service_id: "",
    custom_item: "",
    final_amount: "",
    note: ""
  });

  const selectedService = useMemo(
    () => services.find((item) => item.id === form.service_id),
    [form.service_id, services]
  );

  async function load() {
    const [{ data: quoteData }, { data: serviceData }] = await Promise.all([
      listQuotations(),
      listServiceItems()
    ]);
    setRows((quoteData || []) as QuoteRow[]);
    setServices(((serviceData || []) as ServiceRow[]).filter((item) => item.active));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    setForm((current) => ({
      ...current,
      custom_item: current.custom_item || selectedService.name,
      final_amount: String(Number(selectedService.base_price || 0))
    }));
  }, [selectedService]);

  async function createQuotation() {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    const amount = Number(form.final_amount || selectedService?.base_price || 0);
    if (!form.customer_name || !form.plate_no) return alert("請填寫客戶姓名與車牌。");
    if (!form.custom_item && !selectedService) return alert("請選擇方案或輸入自訂項目。");

    setSaving(true);
    const itemName = form.custom_item || selectedService?.name || "自訂服務";
    const category = selectedService?.category || "其他備註";

    const { data, error } = await supabase
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
        remark: form.note
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return alert(error?.message || "建立報價單失敗。");
    }

    await supabase.from("quotation_items").insert({
      shop_id: profile.shop_id,
      quotation_id: data.id,
      item_name: itemName,
      category,
      quantity: 1,
      unit_price: amount,
      subtotal: amount
    });

    setForm({
      customer_name: "",
      customer_phone: "",
      plate_no: "",
      service_id: "",
      custom_item: "",
      final_amount: "",
      note: ""
    });
    setSaving(false);
    load();
  }

  async function createQuotationFromDraft(draft: QuoteDraft) {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    const amount = Number(draft.final_amount || 0);
    if (!draft.customer_name || !draft.plate_no) return alert("請填寫車主姓名與車牌。");

    setSaving(true);
    const { data, error } = await supabase
      .from("quotations")
      .insert({
        shop_id: profile.shop_id,
        created_by: profile.id,
        quote_no: `Q${Date.now()}`,
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        plate_no: draft.plate_no,
        total_amount: amount,
        final_amount: amount,
        status: "pending",
        remark: draft.note
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return alert(error?.message || "建立報價單失敗。");
    }

    await supabase.from("quotation_items").insert({
      shop_id: profile.shop_id,
      quotation_id: data.id,
      item_name: draft.custom_item,
      category: "打翻評估",
      quantity: 1,
      unit_price: amount,
      subtotal: amount
    });

    setSaving(false);
    await load();
    alert("打翻評估報價單已建立。");
  }

  async function updateStatus(row: QuoteRow, status: string) {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <RequireAuth>
      <section className="space-y-5" id="quotation-pdf-area">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">製作報價單</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
            <p className="mt-1 text-sm text-neutral-500">
              手動建立現場評估報價，所有客戶資料由現場人員填寫。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={createQuotation} disabled={saving} className="primary-btn">
              {saving ? "建立中..." : "手動新增報價"}
            </button>
            <PdfExportButton targetId="quotation-pdf-area" filename="報價單.pdf" />
          </div>
        </div>

        <InteriorQuoteBuilder
          onGenerate={createQuotationFromDraft}
        />

        <div className="card grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="text-sm font-black text-carcare-yellow">手動補充</p>
            <h2 className="text-xl font-black">一般報價欄位</h2>
          </div>
          <input className="form-input" placeholder="客戶姓名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className="form-input" placeholder="聯絡電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className="form-input" placeholder="車牌號碼" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
          <select className="form-input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value, final_amount: "", custom_item: "" })}>
            <option value="">選擇後台價目項目</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} / ${Number(service.base_price || 0).toLocaleString()}
              </option>
            ))}
          </select>
          <input className="form-input" placeholder="自訂服務名稱" value={form.custom_item} onChange={(e) => setForm({ ...form, custom_item: e.target.value })} />
          <input className="form-input" placeholder="最終報價金額" value={form.final_amount} onChange={(e) => setForm({ ...form, final_amount: e.target.value })} />
          <textarea className="form-input md:col-span-3" placeholder="備註，例如車況、客戶需求、優惠內容" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <div className="card table-wrap">
          <h2 className="mb-4 text-xl font-black">歷史報價紀錄</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>報價單號</th>
                <th>客戶</th>
                <th>電話</th>
                <th>車牌</th>
                <th>金額</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.quote_no}</td>
                  <td>{row.customer_name || "-"}</td>
                  <td>{row.customer_phone || "-"}</td>
                  <td>{row.plate_no || "-"}</td>
                  <td>${Number(row.final_amount || row.total_amount || 0).toLocaleString()}</td>
                  <td>{statusText[row.status] || row.status}</td>
                  <td>
                    <select
                      className="form-input min-w-36"
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                    >
                      <option value="pending">待客戶確認</option>
                      <option value="confirmed">已確認</option>
                      <option value="converted">已轉工單</option>
                      <option value="void">作廢</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="text-center text-neutral-500">
                    目前尚無報價單
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import PdfExportButton from "@/components/PdfExportButton";
import { getCurrentProfile } from "@/lib/auth";
import { listQuotations } from "@/lib/db";
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
};

export default function QuotationsPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    plate_no: "",
    item_name: "",
    final_amount: ""
  });

  async function load() {
    const { data } = await listQuotations();
    setRows((data || []) as QuoteRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createQuotation() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("請先綁定門店");
    const amount = Number(form.final_amount || 0);
    if (!form.customer_name || !form.plate_no) return alert("請填客戶與車牌");

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
        status: "pending"
      })
      .select("id")
      .single();

    if (error || !data) return alert(error?.message || "建立失敗");
    if (form.item_name) {
      await supabase.from("quotation_items").insert({
        shop_id: profile.shop_id,
        quotation_id: data.id,
        item_name: form.item_name,
        category: "基礎保養",
        quantity: 1,
        unit_price: amount,
        subtotal: amount
      });
    }
    setForm({ customer_name: "", customer_phone: "", plate_no: "", item_name: "", final_amount: "" });
    load();
  }

  return (
    <RequireAuth>
      <section className="card" id="quotation-pdf-area">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">營運模組</p>
            <h1 className="text-2xl font-black">報價單管理</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={createQuotation} className="primary-btn">新增報價</button>
            <PdfExportButton targetId="quotation-pdf-area" filename="報價清單.pdf" />
          </div>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-5">
          <input className="form-input" placeholder="客戶姓名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className="form-input" placeholder="電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className="form-input" placeholder="車牌" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
          <input className="form-input" placeholder="施工項目" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
          <input className="form-input" placeholder="報價金額" value={form.final_amount} onChange={(e) => setForm({ ...form, final_amount: e.target.value })} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>報價單</th>
                <th>客戶</th>
                <th>車牌</th>
                <th>總金額</th>
                <th>成交金額</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.quote_no}</td>
                  <td>{row.customer_name || "-"}</td>
                  <td>{row.plate_no || "-"}</td>
                  <td>${Number(row.total_amount || 0).toLocaleString()}</td>
                  <td>${Number(row.final_amount || 0).toLocaleString()}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

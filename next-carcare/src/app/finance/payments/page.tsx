"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listPayments } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  payment_no: string | null;
  pay_type: string;
  amount: number;
  paid_at: string;
  check_status: string;
  remark: string | null;
};

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [form, setForm] = useState({ pay_type: "現金", amount: "", remark: "" });

  async function load() {
    const { data } = await listPayments();
    setRows((data || []) as PaymentRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPayment() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("請先綁定門店");
    const { error } = await supabase.from("payment").insert({
      shop_id: profile.shop_id,
      payment_no: `P${Date.now()}`,
      pay_type: form.pay_type,
      amount: Number(form.amount || 0),
      operator_id: profile.id,
      check_status: "pending",
      remark: form.remark
    });
    if (error) return alert(error.message);
    setForm({ pay_type: "現金", amount: "", remark: "" });
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black">收款登記與核銷</h1>
          <button onClick={createPayment} className="primary-btn">新增收款</button>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <select className="form-input" value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value })}>
            <option>現金</option>
            <option>匯款</option>
            <option>刷卡</option>
            <option>訂金</option>
          </select>
          <input className="form-input" placeholder="金額" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <input className="form-input" placeholder="備註" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>流水號</th>
                <th>付款方式</th>
                <th>金額</th>
                <th>時間</th>
                <th>狀態</th>
                <th>備註</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.payment_no || "-"}</td>
                  <td>{row.pay_type}</td>
                  <td>${Number(row.amount || 0).toLocaleString()}</td>
                  <td>{row.paid_at}</td>
                  <td>{row.check_status}</td>
                  <td>{row.remark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

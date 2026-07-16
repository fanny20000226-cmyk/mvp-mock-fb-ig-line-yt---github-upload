"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listPayments } from "@/lib/db";

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

  useEffect(() => {
    listPayments().then(({ data }) => setRows((data || []) as PaymentRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black">收款登記與核銷</h1>
          <button className="primary-btn">新增收款</button>
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


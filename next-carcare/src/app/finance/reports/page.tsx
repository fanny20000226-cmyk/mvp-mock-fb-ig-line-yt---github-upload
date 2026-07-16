"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import StatCard from "@/components/StatCard";
import { listPayments } from "@/lib/db";

type PaymentRow = {
  id: string;
  pay_type: string;
  amount: number;
  paid_at: string;
};

export default function FinanceReportsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);

  useEffect(() => {
    listPayments().then(({ data }) => setRows((data || []) as PaymentRow[]));
  }, []);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows]
  );

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => map.set(row.pay_type, (map.get(row.pay_type) || 0) + Number(row.amount || 0)));
    return Array.from(map.entries());
  }, [rows]);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <StatCard title="總收款金額" value={`$${total.toLocaleString()}`} />
          <StatCard title="收款筆數" value={rows.length} />
        </section>

        <section className="card">
          <h1 className="mb-4 text-2xl font-black">收款方式統計</h1>
          <div className="grid gap-3 md:grid-cols-3">
            {byType.map(([type, amount]) => (
              <div key={type} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{type}</p>
                <p className="mt-2 text-2xl font-black text-carcare-yellow">
                  ${amount.toLocaleString()}
                </p>
              </div>
            ))}
            {!byType.length ? (
              <p className="rounded-xl border border-dashed p-6 text-neutral-500">
                尚未有收款資料。
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

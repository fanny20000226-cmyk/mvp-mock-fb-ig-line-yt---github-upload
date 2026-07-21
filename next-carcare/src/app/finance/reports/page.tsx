"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import StatCard from "@/components/StatCard";
import { listPayments } from "@/lib/db";
import { money } from "@/lib/receipts";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  pay_type: string;
  amount: number;
  paid_at: string;
};

export default function FinanceReportsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [taxStats, setTaxStats] = useState({ beforeTax: 0, tax: 0 });

  useEffect(() => {
    listPayments().then(({ data }) => setRows((data || []) as PaymentRow[]));
    supabase
      .from("receipt_records")
      .select("amount_before_tax, total_tax")
      .then(({ data }) => {
        setTaxStats({
          beforeTax: (data || []).reduce((sum, row) => sum + Number(row.amount_before_tax || 0), 0),
          tax: (data || []).reduce((sum, row) => sum + Number(row.total_tax || 0), 0)
        });
      });
  }, []);

  const incomeRows = useMemo(() => rows.filter((row) => Number(row.amount || 0) >= 0), [rows]);
  const expenseRows = useMemo(() => rows.filter((row) => Number(row.amount || 0) < 0), [rows]);

  const incomeTotal = useMemo(
    () => incomeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [incomeRows]
  );

  const expenseTotal = useMemo(
    () => expenseRows.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0),
    [expenseRows]
  );

  const netTotal = incomeTotal - expenseTotal;

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => map.set(row.pay_type, (map.get(row.pay_type) || 0) + Number(row.amount || 0)));
    return Array.from(map.entries());
  }, [rows]);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="收入合計" value={`$${incomeTotal.toLocaleString()}`} />
          <StatCard title="支出合計" value={`$${expenseTotal.toLocaleString()}`} />
          <StatCard title="淨額" value={`$${netTotal.toLocaleString()}`} />
          <StatCard title="流水筆數" value={rows.length} />
          <StatCard title="未稅營業額" value={money(taxStats.beforeTax)} />
          <StatCard title="營業稅總額" value={money(taxStats.tax)} />
        </section>

        <section className="card">
          <h1 className="mb-4 text-2xl font-black">收支方式統計</h1>
          <div className="grid gap-3 md:grid-cols-3">
            {byType.map(([type, amount]) => (
              <div key={type} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{type}</p>
                <p className={`mt-2 text-2xl font-black ${amount < 0 ? "text-red-600" : "text-carcare-yellow"}`}>
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

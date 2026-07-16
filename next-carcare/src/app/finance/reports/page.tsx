"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import StatCard from "@/components/StatCard";
import { listPayments } from "@/lib/db";

export default function FinanceReportsPage() {
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    listPayments().then(({ data }) => {
      setCount(data?.length || 0);
      setTotal((data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0));
    });
  }, []);

  return (
    <RequireAuth>
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="累計收款" value={`$${total.toLocaleString()}`} />
        <StatCard title="收款筆數" value={count} />
      </div>
    </RequireAuth>
  );
}


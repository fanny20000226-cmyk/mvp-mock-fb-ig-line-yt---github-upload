"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RequireAuth from "@/components/RequireAuth";
import StatCard from "@/components/StatCard";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Row[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [attendance, setAttendance] = useState(0);
  const [chartRows, setChartRows] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const { data: orderRows } = await supabase
        .from("construction_orders")
        .select("id, order_no, status, start_at")
        .order("created_at", { ascending: false })
        .limit(8);

      const { data: payments } = await supabase
        .from("payment")
        .select("amount, paid_at")
        .gte("paid_at", today);

      const { data: attendanceRows } = await supabase
        .from("attendance")
        .select("id")
        .eq("work_date", today);

      setOrders((orderRows || []) as Row[]);
      setRevenue(
        (payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
      );
      const grouped = new Map<string, number>();
      (payments || []).forEach((row) => {
        const date = String(row.paid_at || "").slice(5, 10) || "今日";
        grouped.set(date, (grouped.get(date) || 0) + Number(row.amount || 0));
      });
      setChartRows(
        Array.from(grouped.entries()).map(([date, amount]) => ({ date, amount }))
      );
      setAttendance(attendanceRows?.length || 0);
    }

    load();
  }, []);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard title="今日營業額" value={`$${revenue.toLocaleString()}`} />
          <StatCard title="待辦施工單" value={orders.length} />
          <StatCard title="今日出勤" value={attendance} />
        </section>

        <section className="card">
          <h1 className="mb-4 text-2xl font-black">營業額圖表</h1>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#FFCC00" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card">
          <h1 className="mb-4 text-2xl font-black">今日待辦施工單</h1>
          <div className="grid gap-3">
            {orders.length ? (
              orders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 p-4 md:flex-row md:items-center"
                >
                  <div>
                    <p className="font-black">{order.order_no}</p>
                    <p className="text-sm text-neutral-500">
                      {order.start_at || "尚未排程"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-carcare-yellow px-3 py-1 text-sm font-black">
                    {order.status}
                  </span>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-neutral-500">
                目前沒有施工待辦。
              </p>
            )}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import RequireAuth from "@/components/RequireAuth";
import StatCard from "@/components/StatCard";
import { supabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
};

const quickLinks = [
  { href: "/operations/paste-reservation", title: "貼上填單", desc: "複製客戶預約資料，自動填好並建立訂單" },
  { href: "/operations/evaluation", title: "預約評估", desc: "12 欄評估表，可貼上文字自動帶入" },
  { href: "/operations/cars", title: "客戶車輛", desc: "建立客戶、電話、車牌與車型資料" },
  { href: "/operations/services", title: "服務價目", desc: "管理套餐、加購、贈送、外包與備註項目" },
  { href: "/operations/quotations", title: "製作報價單", desc: "建立報價、產生 PDF、轉施工單" },
  { href: "/operations/orders", title: "訂單管理", desc: "查看、篩選、改狀態與取消訂單" },
  { href: "/operations/cancellations", title: "取消 / 改期", desc: "審核取消申請與改期紀錄" },
  { href: "/operations/construction", title: "施工訂單", desc: "追蹤待施工、施工中、完工狀態" },
  { href: "/annotations", title: "車況圖片標註", desc: "上傳照片並圈選施工區域" },
  { href: "/finance/payments", title: "收款核銷", desc: "登記現金、匯款、刷卡與訂金" },
  { href: "/hr/attendance", title: "員工打卡", desc: "上下班打卡與出勤紀錄" },
  { href: "/permissions", title: "權限管理", desc: "新增帳號、設定角色與門市" }
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [attendance, setAttendance] = useState(0);
  const [quoteCount, setQuoteCount] = useState(0);
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

      const { count } = await supabase
        .from("quotations")
        .select("id", { count: "exact", head: true });

      setOrders((orderRows || []) as OrderRow[]);
      setRevenue((payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0));
      setAttendance(attendanceRows?.length || 0);
      setQuoteCount(count || 0);

      const grouped = new Map<string, number>();
      (payments || []).forEach((row) => {
        const date = String(row.paid_at || "").slice(5, 10) || "今日";
        grouped.set(date, (grouped.get(date) || 0) + Number(row.amount || 0));
      });
      setChartRows(Array.from(grouped.entries()).map(([date, amount]) => ({ date, amount })));
    }

    load();
  }, []);

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="今日營業額" value={`$${revenue.toLocaleString()}`} />
          <StatCard title="施工訂單" value={orders.length} />
          <StatCard title="報價單總數" value={quoteCount} />
          <StatCard title="今日出勤" value={attendance} />
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">CarCare System</p>
              <h1 className="text-2xl font-black">工作台總覽</h1>
              <p className="mt-1 text-sm text-neutral-500">
                常用功能已補回到這裡，也可以從左側選單進入各模組。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-carcare-yellow"
              >
                <p className="text-lg font-black text-carcare-black">{item.title}</p>
                <p className="mt-2 text-sm text-neutral-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card">
            <h2 className="mb-4 text-xl font-black">今日收款趨勢</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#ffc107" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-black">待處理施工單</h2>
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
                >
                  <p className="font-black">{order.order_no}</p>
                  <p className="mt-1 text-sm text-neutral-500">狀態：{order.status}</p>
                </div>
              ))}
              {!orders.length ? (
                <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">
                  目前沒有待處理施工單
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

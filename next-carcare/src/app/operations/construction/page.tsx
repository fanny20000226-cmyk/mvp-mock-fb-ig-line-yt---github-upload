"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listConstructionOrders } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
  finish_at: string | null;
  total_amount: number;
  paid_amount: number;
  cars?: {
    customer_name?: string | null;
    plate_no?: string | null;
  } | null;
};

const statusText: Record<string, string> = {
  pending: "待確認",
  scheduled: "已排程",
  working: "施工中",
  finished: "已完工",
  cancelled: "取消"
};

export default function ConstructionPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);

  async function load() {
    const { data } = await listConstructionOrders();
    setRows((data || []) as OrderRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(row: OrderRow, status: string) {
    const patch: Record<string, string | null> = { status };
    if (status === "working" && !row.start_at) patch.start_at = new Date().toISOString();
    if (status === "finished" && !row.finish_at) patch.finish_at = new Date().toISOString();

    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5">
          <p className="text-sm font-black text-carcare-yellow">施工追蹤</p>
          <h1 className="text-2xl font-black">施工訂單管理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            管理待確認、施工中、已完工與取消訂單。
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>施工單號</th>
                <th>客戶 / 車牌</th>
                <th>狀態</th>
                <th>開始時間</th>
                <th>完工時間</th>
                <th>總金額</th>
                <th>已收款</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.order_no}</td>
                  <td>
                    <p className="font-black text-neutral-900">{row.cars?.customer_name || "-"}</p>
                    <p className="text-xs text-neutral-500">{row.cars?.plate_no || "-"}</p>
                  </td>
                  <td>
                    <select
                      className="form-input min-w-32"
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                    >
                      <option value="pending">待確認</option>
                      <option value="scheduled">已排程</option>
                      <option value="working">施工中</option>
                      <option value="finished">已完工</option>
                      <option value="cancelled">取消</option>
                    </select>
                  </td>
                  <td>{row.start_at || "-"}</td>
                  <td>{row.finish_at || "-"}</td>
                  <td>${Number(row.total_amount || 0).toLocaleString()}</td>
                  <td>${Number(row.paid_amount || 0).toLocaleString()}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="text-center text-neutral-500">
                    尚未建立施工訂單。
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

"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listConstructionOrders } from "@/lib/db";

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
  finish_at: string | null;
  total_amount: number;
  paid_amount: number;
};

export default function ConstructionPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);

  useEffect(() => {
    listConstructionOrders().then(({ data }) => setRows((data || []) as OrderRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <h1 className="mb-5 text-2xl font-black">施工單管理</h1>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>施工單</th>
                <th>狀態</th>
                <th>開始</th>
                <th>完工</th>
                <th>金額</th>
                <th>已收</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.order_no}</td>
                  <td>{row.status}</td>
                  <td>{row.start_at || "-"}</td>
                  <td>{row.finish_at || "-"}</td>
                  <td>${Number(row.total_amount || 0).toLocaleString()}</td>
                  <td>${Number(row.paid_amount || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


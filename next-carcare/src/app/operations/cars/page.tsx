"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listCars } from "@/lib/db";

type CarRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
};

export default function CarsPage() {
  const [rows, setRows] = useState<CarRow[]>([]);

  useEffect(() => {
    listCars().then(({ data }) => setRows((data || []) as CarRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">營運模組</p>
            <h1 className="text-2xl font-black">車輛客戶管理</h1>
          </div>
          <button className="primary-btn">新增車輛</button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>客戶</th>
                <th>電話</th>
                <th>車牌</th>
                <th>車型</th>
                <th>年份</th>
                <th>顏色</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.customer_name}</td>
                  <td>{row.customer_phone || "-"}</td>
                  <td>{row.plate_no || "-"}</td>
                  <td>{[row.brand, row.model].filter(Boolean).join(" ") || "-"}</td>
                  <td>{row.year || "-"}</td>
                  <td>{row.color || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


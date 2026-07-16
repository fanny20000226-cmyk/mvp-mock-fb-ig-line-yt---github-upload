"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type BonusRow = {
  id: string;
  year_month: string;
  base_amount: number;
  bonus_rate: number;
  bonus_amount: number;
  status: string;
};

export default function BonusPage() {
  const [rows, setRows] = useState<BonusRow[]>([]);

  useEffect(() => {
    supabase
      .from("bonus_record")
      .select("id, year_month, base_amount, bonus_rate, bonus_amount, status")
      .order("year_month", { ascending: false })
      .then(({ data }) => setRows((data || []) as BonusRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5">
          <p className="text-sm font-black text-carcare-yellow">獎金管理</p>
          <h1 className="text-2xl font-black">員工月度獎金</h1>
          <p className="mt-1 text-sm text-neutral-500">
            後續可依施工單與門店比例自動產生獎金明細。
          </p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>計算基礎</th>
                <th>比例</th>
                <th>獎金</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.year_month}</td>
                  <td>${Number(row.base_amount || 0).toLocaleString()}</td>
                  <td>{row.bonus_rate}%</td>
                  <td>${Number(row.bonus_amount || 0).toLocaleString()}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-500">
                    尚未有獎金紀錄。
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

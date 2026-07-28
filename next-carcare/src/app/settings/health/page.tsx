"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type CheckRow = {
  key: string;
  title: string;
  table: string;
  href: string;
  count: number | null;
  ok: boolean;
  message: string;
};

const checks = [
  { key: "quotations", title: "報價單", table: "quotations", href: "/operations/quotations" },
  { key: "construction", title: "施工工單", table: "construction_orders", href: "/operations/construction" },
  { key: "cars", title: "車輛資料", table: "cars", href: "/operations/cars" },
  { key: "customers", title: "客戶資料", table: "customers", href: "/operations/customers" },
  { key: "payments", title: "收款紀錄", table: "payment", href: "/finance/payments" },
  { key: "photos", title: "照片標註", table: "image_annotations", href: "/annotations" },
  { key: "staff", title: "員工資料", table: "staff_info", href: "/hr/staff-accounts" },
  { key: "attendance", title: "出勤紀錄", table: "attendance", href: "/hr/attendance" }
];

async function countTable(table: string) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) return { count: null, ok: false, message: error.message };
  return { count: count || 0, ok: true, message: "" };
}

export default function SystemHealthPage() {
  const [rows, setRows] = useState<CheckRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState("");

  async function runChecks() {
    setLoading(true);
    const result = await Promise.all(
      checks.map(async (item) => {
        const status = await countTable(item.table);
        return { ...item, ...status };
      })
    );
    setRows(result);
    setLastCheckedAt(new Date().toLocaleString("zh-TW"));
    setLoading(false);
  }

  useEffect(() => {
    runChecks();
  }, []);

  const summary = useMemo(() => {
    const ok = rows.filter((row) => row.ok).length;
    const failed = rows.filter((row) => !row.ok).length;
    const totalRows = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    return { ok, failed, totalRows };
  }, [rows]);

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">System Health</p>
          <h1 className="text-2xl font-black">系統連動檢查</h1>
          <p className="mt-1 text-sm text-neutral-500">
            用這裡快速確認報價、施工、車輛、客戶、收款、人資等前後台資料表是否能正常讀取。
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">正常模組</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{summary.ok}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">異常模組</p>
            <p className="mt-2 text-3xl font-black text-red-600">{summary.failed}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">可讀資料筆數</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{summary.totalRows}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">檢查時間</p>
            <p className="mt-2 text-sm font-black">{lastCheckedAt || "-"}</p>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-black">功能對應資料檢查</h2>
            <button type="button" className="primary-btn" onClick={runChecks} disabled={loading}>
              {loading ? "檢查中..." : "重新檢查"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-carcare-black text-white">
                <tr>
                  <th className="p-3">功能</th>
                  <th className="p-3">資料表</th>
                  <th className="p-3">筆數</th>
                  <th className="p-3">狀態</th>
                  <th className="p-3">前往</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-neutral-200">
                    <td className="p-3 font-black">{row.title}</td>
                    <td className="p-3">{row.table}</td>
                    <td className="p-3">{row.count ?? "-"}</td>
                    <td className="p-3">
                      {row.ok ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                          讀取正常
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
                          讀取失敗：{row.message}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <Link href={row.href} className="secondary-btn">
                        開啟
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  payment_no: string | null;
  pay_type: string;
  amount: number;
  paid_at: string;
  check_status: string;
  remark: string | null;
};

function downloadCsv(rows: PaymentRow[]) {
  const header = ["流水號", "類型", "金額", "日期", "狀態", "備註"];
  const body = rows.map((row) => [
    row.payment_no || "",
    row.pay_type,
    String(row.amount || 0),
    row.paid_at,
    row.check_status,
    row.remark || ""
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `財務交易明細_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function weekStart() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function monthStart() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function TransactionsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [filters, setFilters] = useState({
    store: "",
    start: monthStart(),
    end: new Date().toISOString().slice(0, 10),
    status: "",
    type: ""
  });

  async function load() {
    const { data, error } = await supabase
      .from("payment")
      .select("id, payment_no, pay_type, amount, paid_at, check_status, remark")
      .order("paid_at", { ascending: false });
    if (error) return alert(error.message);
    setRows((data || []) as PaymentRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const paidDate = String(row.paid_at || "").slice(0, 10);
        const storeOk = !filters.store || String(row.remark || "").includes(filters.store);
        return (
          storeOk &&
          (!filters.start || paidDate >= filters.start) &&
          (!filters.end || paidDate <= filters.end) &&
          (!filters.status || row.check_status === filters.status) &&
          (!filters.type || row.pay_type.includes(filters.type))
        );
      }),
    [filters, rows]
  );

  const income = filteredRows.filter((row) => Number(row.amount || 0) >= 0);
  const expense = filteredRows.filter((row) => Number(row.amount || 0) < 0);
  const incomeTotal = income.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenseTotal = expense.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const depositTotal = income
    .filter((row) => row.pay_type.includes("訂金"))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const unpaidTotal = filteredRows
    .filter((row) => row.check_status === "pending" || row.pay_type.includes("掛帳"))
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  function setPreset(range: "week" | "month") {
    setFilters((current) => ({
      ...current,
      start: range === "week" ? weekStart() : monthStart(),
      end: new Date().toISOString().slice(0, 10)
    }));
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">財務管理</p>
              <h1 className="text-2xl font-black">交易明細與週/月報表</h1>
              <p className="mt-1 text-sm text-neutral-500">依日期、門市、收款狀態與施工類型查詢流水。</p>
            </div>
            <button className="primary-btn" type="button" onClick={() => downloadCsv(filteredRows)}>
              匯出 Excel CSV
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <select className="form-input" value={filters.store} onChange={(event) => setFilters({ ...filters, store: event.target.value })}>
              <option value="">全部門市</option>
              <option>三重</option>
              <option>桃園</option>
              <option>新竹</option>
              <option>台南</option>
              <option>台北</option>
              <option>台中</option>
              <option>高雄</option>
            </select>
            <input className="form-input" type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} />
            <input className="form-input" type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} />
            <select className="form-input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">全部狀態</option>
              <option value="pending">待核銷</option>
              <option value="checked">已核銷</option>
              <option value="expense_pending">支出待審核</option>
              <option value="expense_written_off">支出已核銷</option>
            </select>
            <input className="form-input" placeholder="施工 / 收款類型" value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} />
            <div className="flex gap-2">
              <button className="secondary-btn" type="button" onClick={() => setPreset("week")}>週報</button>
              <button className="secondary-btn" type="button" onClick={() => setPreset("month")}>月報</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card"><p className="text-sm text-neutral-500">營業總額</p><p className="mt-2 text-3xl font-black text-carcare-yellow">${incomeTotal.toLocaleString()}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">訂金總額</p><p className="mt-2 text-3xl font-black text-carcare-yellow">${depositTotal.toLocaleString()}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">未結帳金額</p><p className="mt-2 text-3xl font-black text-carcare-yellow">${unpaidTotal.toLocaleString()}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">支出合計</p><p className="mt-2 text-3xl font-black text-red-600">${expenseTotal.toLocaleString()}</p></div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">交易流水</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>流水號</th>
                  <th>類型</th>
                  <th>金額</th>
                  <th>日期</th>
                  <th>狀態</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.payment_no || "-"}</td>
                    <td>{row.pay_type}</td>
                    <td className={Number(row.amount || 0) < 0 ? "font-black text-red-600" : "font-black"}>
                      ${Number(row.amount || 0).toLocaleString()}
                    </td>
                    <td>{String(row.paid_at || "").slice(0, 16).replace("T", " ")}</td>
                    <td>{row.check_status}</td>
                    <td className="whitespace-pre-wrap">{row.remark || "-"}</td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-500">查無交易明細。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import ReceiptExportButton from "@/components/ReceiptExportButton";
import StatCard from "@/components/StatCard";
import { getCurrentProfile } from "@/lib/auth";
import { canManageReceipts, money } from "@/lib/receipts";
import { supabase } from "@/lib/supabase";

type ReceiptRecord = {
  id: string;
  quotation_id: string | null;
  store_id: string | null;
  create_time: string;
  tax_rate: number;
  total_tax: number;
  amount_before_tax: number;
  total_amount: number;
  receipt_no: string | null;
  customer_name: string | null;
  plate_no: string | null;
};

type StoreRow = {
  id: string;
  name?: string | null;
};

export default function ReceiptsPage() {
  const [rows, setRows] = useState<ReceiptRecord[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    storeId: "",
    startDate: "",
    endDate: "",
    plateNo: "",
    operator: ""
  });

  async function load() {
    const profile = await getCurrentProfile();
    if (!profile || !canManageReceipts(profile.role)) {
      setMessage("目前帳號無法查看收據開立紀錄。");
      return;
    }

    const [{ data: storeData }, receiptResult] = await Promise.all([
      supabase.from("shops").select("id, name").order("name", { ascending: true }),
      supabase
        .from("receipt_records")
        .select("id, quotation_id, store_id, create_time, tax_rate, total_tax, amount_before_tax, total_amount, receipt_no, customer_name, plate_no")
        .order("create_time", { ascending: false })
    ]);

    if (receiptResult.error) {
      setMessage(
        `讀取收據紀錄失敗：${receiptResult.error.message}。若尚未建立資料表，請先執行 supabase-step11-receipts-tax.sql。`
      );
      return;
    }
    setStores((storeData || []) as StoreRow[]);
    setRows((receiptResult.data || []) as ReceiptRecord[]);
    setMessage("");
  }

  useEffect(() => {
    load();
  }, []);

  const storeName = useMemo(() => {
    const map = new Map(stores.map((store) => [store.id, store.name || store.id]));
    return (id?: string | null) => (id ? map.get(id) || id : "-");
  }, [stores]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const time = row.create_time ? new Date(row.create_time).getTime() : 0;
      const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : 0;
      const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
      const plateMatch = filters.plateNo
        ? String(row.plate_no || "").toLowerCase().includes(filters.plateNo.toLowerCase())
        : true;
      return (
        (!filters.storeId || row.store_id === filters.storeId) &&
        time >= start &&
        time <= end &&
        plateMatch
      );
    });
  }, [filters, rows]);

  const totalTax = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.total_tax || 0), 0),
    [filteredRows]
  );
  const totalBeforeTax = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.amount_before_tax || 0), 0),
    [filteredRows]
  );
  const totalAmount = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
    [filteredRows]
  );

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">財務擴充</p>
          <h1 className="text-2xl font-black">收據開立紀錄</h1>
          <p className="mt-1 text-sm text-neutral-500">
            查詢 PEIWAY 消費收據開立紀錄、重印 PDF，並統計未稅與營業稅。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="收據筆數" value={filteredRows.length} />
          <StatCard title="未稅營業額" value={money(totalBeforeTax)} />
          <StatCard title="營業稅總額" value={money(totalTax)} />
          <StatCard title="含稅總額" value={money(totalAmount)} />
        </section>

        <section className="card grid gap-3 md:grid-cols-5">
          <select
            className="form-input"
            value={filters.storeId}
            onChange={(event) => setFilters({ ...filters, storeId: event.target.value })}
          >
            <option value="">全部門市</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name || store.id}
              </option>
            ))}
          </select>
          <input
            className="form-input"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters({ ...filters, startDate: event.target.value })}
          />
          <input
            className="form-input"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters({ ...filters, endDate: event.target.value })}
          />
          <input
            className="form-input"
            placeholder="車牌搜尋"
            value={filters.plateNo}
            onChange={(event) => setFilters({ ...filters, plateNo: event.target.value })}
          />
          <button type="button" className="secondary-btn" onClick={() => setFilters({ storeId: "", startDate: "", endDate: "", plateNo: "", operator: "" })}>
            清除篩選
          </button>
        </section>

        <section className="card table-wrap">
          <h2 className="mb-4 text-xl font-black">收據列表</h2>
          {message ? (
            <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-neutral-600">{message}</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>收據編號</th>
                  <th>門市</th>
                  <th>客戶 / 車牌</th>
                  <th>開立時間</th>
                  <th>未稅</th>
                  <th>稅金</th>
                  <th>含稅總額</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.receipt_no || row.id.slice(0, 8)}</td>
                    <td>{storeName(row.store_id)}</td>
                    <td>
                      <p className="font-black">{row.customer_name || "-"}</p>
                      <p className="text-xs text-neutral-500">{row.plate_no || "-"}</p>
                    </td>
                    <td>{new Date(row.create_time).toLocaleString("zh-TW")}</td>
                    <td>{money(Number(row.amount_before_tax || 0))}</td>
                    <td>{money(Number(row.total_tax || 0))}</td>
                    <td className="font-black text-carcare-yellow">{money(Number(row.total_amount || 0))}</td>
                    <td>
                      <ReceiptExportButton
                        label="重新下載"
                        source={{
                          quotationId: row.quotation_id,
                          quoteNo: row.receipt_no,
                          shopId: row.store_id,
                          customerName: row.customer_name,
                          plateNo: row.plate_no,
                          totalAmount: Number(row.total_amount || 0),
                          taxRate: Number(row.tax_rate || 0.05),
                          createdAt: row.create_time
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={8} className="text-center text-neutral-500">
                      尚無符合條件的收據紀錄。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </RequireAuth>
  );
}

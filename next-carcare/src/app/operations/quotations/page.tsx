"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import PdfExportButton from "@/components/PdfExportButton";
import { listQuotations } from "@/lib/db";

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number;
  final_amount: number;
  status: string;
};

export default function QuotationsPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);

  useEffect(() => {
    listQuotations().then(({ data }) => setRows((data || []) as QuoteRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card" id="quotation-pdf-area">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">營運模組</p>
            <h1 className="text-2xl font-black">報價單管理</h1>
          </div>
          <div className="flex gap-2">
            <button className="primary-btn">新增報價</button>
            <PdfExportButton targetId="quotation-pdf-area" filename="報價清單.pdf" />
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>報價單</th>
                <th>客戶</th>
                <th>車牌</th>
                <th>總金額</th>
                <th>成交金額</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.quote_no}</td>
                  <td>{row.customer_name || "-"}</td>
                  <td>{row.plate_no || "-"}</td>
                  <td>${Number(row.total_amount || 0).toLocaleString()}</td>
                  <td>${Number(row.final_amount || 0).toLocaleString()}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


"use client";

import { useMemo, useState } from "react";
import PeiwayReceiptPdf from "@/components/PeiwayReceiptPdf";
import { exportElementToPdf } from "@/lib/pdf";
import {
  calculateTax,
  canExportSingleReceipt,
  listReceiptItems,
  recordReceiptPrint,
  type ReceiptItem,
  type ReceiptSource
} from "@/lib/receipts";
import { getCurrentProfile } from "@/lib/auth";

export default function ReceiptExportButton({
  source,
  fallbackItems,
  label = "匯出收據PDF"
}: {
  source: ReceiptSource;
  fallbackItems?: ReceiptItem[];
  label?: string;
}) {
  const [items, setItems] = useState<ReceiptItem[]>(fallbackItems || []);
  const [exporting, setExporting] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const targetId = useMemo(
    () => `peiway-receipt-${source.quotationId || source.orderNo || source.quoteNo || "draft"}`.replace(/[^a-zA-Z0-9_-]/g, "-"),
    [source.orderNo, source.quotationId, source.quoteNo]
  );
  const breakdown = calculateTax(source.totalAmount, source.taxRate || undefined);

  async function handleExport() {
    if (exporting) return;
    const profile = await getCurrentProfile();
    if (!profile || !canExportSingleReceipt(profile.role)) {
      return alert("目前帳號沒有開立收據權限。");
    }
    setExporting(true);
    try {
      const loadedItems = await listReceiptItems(source.quotationId, fallbackItems);
      setItems(loadedItems);
      setRenderKey((current) => current + 1);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      await exportElementToPdf(targetId, `PEIWAY_消費收據_${source.plateNo || source.quoteNo || source.orderNo || "receipt"}.pdf`);
      await recordReceiptPrint(source, breakdown);
    } catch (error) {
      alert(
        `${error instanceof Error ? error.message : "收據匯出失敗。"}\n\n若資料表尚未建立，請先在 Supabase SQL 執行 supabase-step11-receipts-tax.sql。`
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-xl bg-carcare-yellow px-5 py-3 font-black text-carcare-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {exporting ? "開立中..." : label}
      </button>
      <div className="fixed left-[-9999px] top-0 w-[794px] bg-white">
        <div id={targetId}>
          <PeiwayReceiptPdf key={renderKey} source={source} items={items} breakdown={breakdown} />
        </div>
      </div>
    </>
  );
}

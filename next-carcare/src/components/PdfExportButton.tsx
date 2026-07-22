"use client";

import { useState } from "react";
import { exportElementToPdf } from "@/lib/pdf";

export default function PdfExportButton({
  targetId,
  filename
}: {
  targetId: string;
  filename: string;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportElementToPdf(targetId, filename);
    } catch (error) {
      console.error(error);
      alert("PDF 匯出失敗，請確認頁面內容或圖片是否已載入完成。");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="rounded-xl bg-carcare-yellow px-5 py-3 font-black text-carcare-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {exporting ? "匯出中..." : "匯出 PDF"}
    </button>
  );
}

"use client";

import { exportElementToPdf } from "@/lib/pdf";

export default function PdfExportButton({
  targetId,
  filename
}: {
  targetId: string;
  filename: string;
}) {
  return (
    <button
      onClick={() => exportElementToPdf(targetId, filename)}
      className="rounded-xl bg-carcare-yellow px-5 py-3 font-black text-carcare-black"
    >
      匯出 PDF
    </button>
  );
}


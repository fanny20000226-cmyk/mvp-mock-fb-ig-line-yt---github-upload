"use client";

import { useState } from "react";
import { downloadPhotosAsZip } from "@/lib/photoZip";

export default function PhotoZipButton({
  urls,
  filename,
  label = "下載本筆所有施工照片"
}: {
  urls: string[];
  filename: string;
  label?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadPhotosAsZip(urls, filename);
    } catch (error) {
      alert(error instanceof Error ? error.message : "照片打包下載失敗。");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button type="button" className="primary-btn" onClick={handleDownload} disabled={downloading}>
      {downloading ? "下載中..." : label}
    </button>
  );
}

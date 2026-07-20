"use client";

import type { ReactNode } from "react";

type OrderRowForPdf = {
  order_no: string;
  status: string;
  start_at: string | null;
  finish_at: string | null;
  total_amount: number;
  paid_amount: number;
  remark?: string | null;
  cars?: {
    customer_name?: string | null;
    customer_phone?: string | null;
    plate_no?: string | null;
    brand?: string | null;
    model?: string | null;
    year?: string | null;
  } | null;
  quotations?: {
    quote_no?: string | null;
    final_amount?: number | null;
    remark?: string | null;
    status?: string | null;
  } | null;
};

const workOrderCategories = ["基礎保養", "加購", "贈送", "外包", "其他備註"] as const;

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString()}`;
}

function carName(row: OrderRowForPdf) {
  return [row.cars?.brand, row.cars?.model, row.cars?.year].filter(Boolean).join(" ") || "";
}

function splitItems(value: string) {
  return value
    .split(/[；,，、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !["未選", "無", "-"].includes(item));
}

function linesFromRemark(row: OrderRowForPdf) {
  return [row.quotations?.remark, row.remark].filter(Boolean).join("\n").split(/\r?\n/);
}

function valueAfterLabel(lines: string[], label: string) {
  const line = lines.find((item) => item.startsWith(`${label}：`));
  return line ? line.replace(`${label}：`, "").trim() : "";
}

function categoryNote(lines: string[], category: string) {
  return lines
    .filter((line) => line.includes(`：${category} /`))
    .map((line) => line.split("/").slice(1).join("/").trim())
    .filter(Boolean)
    .filter((item) => item !== "無");
}

function buildCategoryItems(row: OrderRowForPdf) {
  const lines = linesFromRemark(row);
  const carpetItems = splitItems(valueAfterLabel(lines, "地毯"));
  const seatItems = splitItems(valueAfterLabel(lines, "座椅"));
  const extraItems = splitItems(valueAfterLabel(lines, "附加項目"));
  const manualItems = splitItems(valueAfterLabel(lines, "手動補充"));
  const suggestion = valueAfterLabel(lines, "建議方案");

  return {
    基礎保養: [...carpetItems, ...seatItems],
    加購: [...extraItems, ...manualItems, ...categoryNote(lines, "加購")],
    贈送: categoryNote(lines, "贈送"),
    外包: categoryNote(lines, "外包"),
    其他備註: [
      ...categoryNote(lines, "其他備註"),
      suggestion && suggestion !== "無" ? suggestion : "",
      row.remark || ""
    ].filter(Boolean)
  };
}

function firstAmountFromRemark(row: OrderRowForPdf, label: string) {
  const value = valueAfterLabel(linesFromRemark(row), label);
  const match = value.match(/[\d,]+/);
  return match ? Number(match[0].replace(/,/g, "")) : 0;
}

export default function PeiwayWorkOrderPdf({
  row,
  beforePhotoUrls,
  afterPhotoUrls
}: {
  row: OrderRowForPdf;
  beforePhotoUrls: string[];
  afterPhotoUrls: string[];
}) {
  const categories = buildCategoryItems(row);
  const openedAt = new Date().toLocaleDateString("zh-TW");
  const carpetSubtotal = firstAmountFromRemark(row, "地毯小計");
  const seatSubtotal = firstAmountFromRemark(row, "座椅小計");
  const addonSubtotal = firstAmountFromRemark(row, "附加項目") + firstAmountFromRemark(row, "手動補充");
  const depositAmount = firstAmountFromRemark(row, "訂金") || Number(row.paid_amount || 0);
  const finalAmount = Math.max(Number(row.total_amount || row.quotations?.final_amount || 0) - depositAmount, 0);

  return (
    <div className="min-h-[1123px] bg-white text-neutral-950">
      <div className="flex items-center justify-between bg-[#111] px-7 py-6 text-white">
        <div className="rounded-xl border-2 border-white px-4 py-2 text-4xl font-black italic tracking-tight">
          PEI<span className="text-[#dfff00]">WAY</span>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-wide">PEIWAY 汽車施工確認工單</h2>
          <p className="mt-1 text-sm text-white/70">DIGITAL WORK ORDER</p>
        </div>
        <div className="text-right text-sm">
          <p>工單編號：{row.order_no}</p>
          <p>開單日期：{openedAt}</p>
        </div>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <PdfPanel title="客戶車輛資訊">
            <InfoLine label="車主姓名" value={row.cars?.customer_name || ""} />
            <InfoLine label="聯絡電話" value={row.cars?.customer_phone || ""} />
            <InfoLine label="車廠" value={row.cars?.brand || ""} />
            <InfoLine label="車型" value={carName(row)} />
            <InfoLine label="車牌" value={row.cars?.plate_no || ""} />
          </PdfPanel>
          <PdfPanel title="五大分類施工項目">
            <div className="grid grid-cols-1 gap-2 text-sm">
              {workOrderCategories.map((category) => (
                <div key={category} className="rounded-lg border border-neutral-200 p-2">
                  <p className="font-black">{category}</p>
                  <p className="mt-1 min-h-8 whitespace-pre-wrap text-neutral-700">
                    {categories[category].join("、") || ""}
                  </p>
                </div>
              ))}
            </div>
          </PdfPanel>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PdfPhotoGrid title="施工前照片" urls={beforePhotoUrls} />
          <PdfPhotoGrid title="施工後照片" urls={afterPhotoUrls} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PdfPanel title="費用明細">
            <FeeLine label="地毯小計" value={money(carpetSubtotal)} />
            <FeeLine label="座椅小計" value={money(seatSubtotal)} />
            <FeeLine label="加購項目金額" value={money(addonSubtotal)} />
            <FeeLine label="外包費用" value={money(0)} />
            <FeeLine label="折扣金額" value={money(0)} />
            <FeeLine label="已收訂金" value={money(depositAmount)} />
          </PdfPanel>
          <PdfPanel title="施工時間與備註">
            <InfoLine label="開始時間" value={row.start_at || ""} />
            <InfoLine label="完工時間" value={row.finish_at || ""} />
            <InfoLine label="報價單號" value={row.quotations?.quote_no || ""} />
            <p className="mt-3 min-h-24 whitespace-pre-wrap rounded-lg border border-neutral-200 p-3 text-sm">
              {categories.其他備註.join("\n") || ""}
            </p>
          </PdfPanel>
        </div>

        <div className="rounded-2xl bg-[#111] p-5 text-center text-white">
          <p className="text-2xl font-black">最終實收總金額</p>
          <div className="mt-3 rounded-xl bg-[#ffc107] py-5 text-5xl font-black text-[#111]">
            {money(finalAmount)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-300 p-5 text-lg">
          <p>客戶簽名：__________________</p>
          <p>簽署日期：______ 年 ______ 月 ______ 日</p>
        </div>
      </div>
    </div>
  );
}

function PdfPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-4">
      <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">{title}</h3>
      {children}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-10 grid-cols-[100px_1fr] border-b border-neutral-300 text-sm">
      <span className="flex items-center font-black">{label}</span>
      <span className="flex items-center px-2">{value}</span>
    </div>
  );
}

function FeeLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between border-b border-neutral-200 py-2 text-sm">
      <span>{label}</span>
      <span className="font-black">{value}</span>
    </p>
  );
}

function PdfPhotoGrid({ title, urls }: { title: string; urls: string[] }) {
  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-4">
      <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">{title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => {
          const url = urls[index];
          return url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt={title} className="h-24 w-full rounded-lg border border-neutral-200 object-contain" />
          ) : (
            <div key={index} className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-4xl font-black text-neutral-300">
              +
            </div>
          );
        })}
      </div>
    </div>
  );
}

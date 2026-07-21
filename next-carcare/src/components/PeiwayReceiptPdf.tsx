"use client";

import type { ReceiptItem, ReceiptSource, TaxBreakdown } from "@/lib/receipts";
import { money } from "@/lib/receipts";

export default function PeiwayReceiptPdf({
  source,
  items,
  breakdown,
  storeName = "PEIWAY 汽車美容門市",
  storeAddress = "門市地址可於後台設定",
  storePhone = "門市電話可於後台設定",
  storeTaxId = "統一編號可於後台設定"
}: {
  source: ReceiptSource;
  items: ReceiptItem[];
  breakdown: TaxBreakdown;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  storeTaxId?: string;
}) {
  const openedAt = source.createdAt
    ? new Date(source.createdAt).toLocaleDateString("zh-TW")
    : new Date().toLocaleDateString("zh-TW");
  const documentNo = source.orderNo || source.quoteNo || source.quotationId || "未建立單號";

  return (
    <div className="min-h-[1123px] bg-white text-neutral-950">
      <div className="flex items-center justify-between bg-[#111] px-7 py-6 text-white">
        <div className="rounded-xl border-2 border-white px-4 py-2 text-4xl font-black italic tracking-tight">
          PEI<span className="text-[#dfff00]">WAY</span>
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-wide">消費收據</h2>
          <p className="mt-1 text-sm text-white/70">OFFICIAL RECEIPT</p>
        </div>
        <div className="text-right text-sm">
          <p>單據編號：{documentNo}</p>
          <p>開單日期：{openedAt}</p>
        </div>
      </div>

      <div className="space-y-5 p-7">
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">門市資訊</h3>
            <InfoLine label="門市名稱" value={storeName} />
            <InfoLine label="門市地址" value={storeAddress} />
            <InfoLine label="聯絡電話" value={storePhone} />
            <InfoLine label="統一編號" value={storeTaxId} />
          </div>
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">單據資訊</h3>
            <InfoLine label="工單編號" value={documentNo} />
            <InfoLine label="車主姓名" value={source.customerName || ""} />
            <InfoLine label="聯絡電話" value={source.customerPhone || ""} />
            <InfoLine label="車牌號碼" value={source.plateNo || ""} />
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-300 p-4">
          <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">消費項目清單</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="border border-neutral-300 p-2">項目</th>
                <th className="border border-neutral-300 p-2">單價</th>
                <th className="border border-neutral-300 p-2">數量</th>
                <th className="border border-neutral-300 p-2">小計</th>
              </tr>
            </thead>
            <tbody>
              {(items.length ? items : [{ name: "汽車美容施工服務", quantity: 1, unitPrice: source.totalAmount, subtotal: source.totalAmount }]).map((item, index) => (
                <tr key={`${item.name}-${index}`}>
                  <td className="border border-neutral-300 p-2">{item.name}</td>
                  <td className="border border-neutral-300 p-2">{money(item.unitPrice)}</td>
                  <td className="border border-neutral-300 p-2">{item.quantity}</td>
                  <td className="border border-neutral-300 p-2 font-black">{money(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">稅金計算</h3>
            <FeeLine label="未稅總金額" value={money(breakdown.amountBeforeTax)} />
            <FeeLine label={`營業稅金 ${Math.round(breakdown.taxRate * 100)}%`} value={money(breakdown.taxAmount)} />
            <div className="mt-4 rounded-xl bg-[#ffc107] p-4 text-center">
              <p className="text-sm font-black">含稅總金額</p>
              <p className="mt-1 text-4xl font-black text-[#111]">{money(breakdown.totalAmount)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">備註與簽收</h3>
            <div className="min-h-32 rounded-lg border border-neutral-300 p-3 text-sm">
              本收據依本次施工報價與實收金額開立，若需統一編號或抬頭調整，請洽門市人員。
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <p>簽收人：________________</p>
              <p>日期：____ 年 ____ 月 ____ 日</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-10 grid-cols-[100px_1fr] border-b border-neutral-300 text-sm">
      <span className="flex items-center font-black">{label}</span>
      <span className="flex items-center px-2">{value || ""}</span>
    </div>
  );
}

function FeeLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between border-b border-neutral-200 py-3 text-sm">
      <span>{label}</span>
      <span className="font-black">{value}</span>
    </p>
  );
}

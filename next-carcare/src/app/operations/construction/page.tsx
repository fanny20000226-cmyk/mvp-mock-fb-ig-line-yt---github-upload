"use client";

import { Fragment, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import ConstructionOrderCreator from "@/components/ConstructionOrderCreator";
import PeiwayWorkOrderPdf from "@/components/PeiwayWorkOrderPdf";
import PhotoZipButton from "@/components/PhotoZipButton";
import ReceiptExportButton from "@/components/ReceiptExportButton";
import { listConstructionOrders } from "@/lib/db";
import {
  createMockSmsNotification,
  defaultPickupTemplates,
  photoPreviewLink,
  renderNotifyTemplate
} from "@/lib/notifications";
import { exportElementToPdf } from "@/lib/pdf";
import { supabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  shop_id?: string | null;
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
    id?: string | null;
    quote_no?: string | null;
    final_amount?: number | null;
    remark?: string | null;
    status?: string | null;
  } | null;
};

type WorkOrderPhotos = {
  before: string[];
  after: string[];
};

const statusText: Record<string, string> = {
  pending: "待確認",
  scheduled: "已排程",
  working: "施工中",
  finished: "已完工",
  ready_pickup: "完工待取車",
  picked_up: "已牽車",
  cancelled: "取消"
};

export default function ConstructionPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [photoMap, setPhotoMap] = useState<Record<string, WorkOrderPhotos>>({});
  const [exportingId, setExportingId] = useState("");

  async function load() {
    const { data } = await listConstructionOrders();
    setRows((data || []) as OrderRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(row: OrderRow, status: string) {
    const patch: Record<string, string | null> = { status };
    if (status === "working" && !row.start_at) patch.start_at = new Date().toISOString();
    if ((status === "finished" || status === "ready_pickup") && !row.finish_at) {
      patch.finish_at = new Date().toISOString();
    }

    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id);
    if (error) return alert(error.message);
    if (status === "ready_pickup") {
      await promptPickupNotice(row);
    }
    load();
  }

  function carName(row: OrderRow) {
    return [row.cars?.brand, row.cars?.model, row.cars?.year].filter(Boolean).join(" ") || "-";
  }

  function balance(row: OrderRow) {
    return Number(row.total_amount || 0) - Number(row.paid_amount || 0);
  }

  async function loadWorkOrderPhotos(row: OrderRow) {
    if (photoMap[row.id]) return photoMap[row.id];
    const plateNo = row.cars?.plate_no;
    if (!plateNo) {
      const empty = { before: [], after: [] };
      setPhotoMap((current) => ({ ...current, [row.id]: empty }));
      return empty;
    }
    const { data } = await supabase
      .from("image_annotations")
      .select("image_url, annot_data")
      .contains("annot_data", { plate_no: plateNo })
      .limit(80);

    const photos = (data || []).reduce<WorkOrderPhotos>(
      (result, item) => {
        const type = String((item.annot_data as { type?: string } | null)?.type || "");
        if (!item.image_url) return result;
        if (type.includes("before") && result.before.length < 8) result.before.push(item.image_url);
        if (type.includes("after") && result.after.length < 8) result.after.push(item.image_url);
        return result;
      },
      { before: [], after: [] }
    );
    setPhotoMap((current) => ({ ...current, [row.id]: photos }));
    return photos;
  }

  async function promptPickupNotice(row: OrderRow) {
    const phone = row.cars?.customer_phone || "";
    const ok = window.confirm(
      `施工單已切換為「完工待取車」。\n\n是否建立取車簡訊通知紀錄？\n客戶電話：${phone || "未填"}`
    );
    if (!ok) return;

    const photos = await loadWorkOrderPhotos(row);
    const photoLink = photoPreviewLink([...(photos.before || []), ...(photos.after || [])]);
    const content = renderNotifyTemplate(defaultPickupTemplates.first, photoLink);
    try {
      await createMockSmsNotification({
        quotationId: row.quotations?.id || null,
        storeId: row.shop_id || null,
        customerPhone: phone,
        photoLink,
        content
      });
      alert("已建立 Mock 簡訊通知紀錄，可至「通知紀錄管理」查看。");
    } catch (error) {
      alert(
        `${error instanceof Error ? error.message : "建立通知紀錄失敗。"}\n\n若資料表尚未建立，請先在 Supabase SQL 執行 supabase-step9-notifications.sql。`
      );
    }
  }

  async function toggleExpanded(row: OrderRow, isExpanded: boolean) {
    if (isExpanded) {
      setExpandedId("");
      return;
    }
    setExpandedId(row.id);
    loadWorkOrderPhotos(row);
  }

  async function exportWorkOrderPdf(row: OrderRow) {
    setExportingId(row.id);
    try {
      await loadWorkOrderPhotos(row);
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await exportElementToPdf(`peiway-work-order-pdf-${row.id}`, `PEIWAY_施工確認工單_${row.order_no || "施工單"}.pdf`);
    } finally {
      setExportingId("");
    }
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5">
          <p className="text-sm font-black text-carcare-yellow">施工追蹤</p>
          <h1 className="text-2xl font-black">施工訂單管理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            管理待確認、施工中、已完工與取消訂單。
          </p>
        </div>
        <ConstructionOrderCreator onCreated={load} />
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">全部施工單</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">施工中</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {rows.filter((row) => row.status === "working").length}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">已完工</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {rows.filter((row) => row.status === "finished").length}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-sm text-neutral-500">待收尾款</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {rows.filter((row) => balance(row) > 0).length}
            </p>
          </div>
        </div>

        <div className="table-wrap mt-5">
          <table className="data-table">
            <thead>
              <tr>
                <th>施工單號</th>
                <th>客戶 / 車牌</th>
                <th>狀態</th>
                <th>開始時間</th>
                <th>完工時間</th>
                <th>總金額</th>
                <th>已收款</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td>
                        <p className="font-black">{row.order_no}</p>
                        <p className="text-xs text-neutral-500">
                          原報價：{row.quotations?.quote_no || "-"}
                        </p>
                      </td>
                      <td>
                        <p className="font-black text-neutral-900">{row.cars?.customer_name || "-"}</p>
                        <p className="text-xs text-neutral-500">{row.cars?.plate_no || "-"}</p>
                        <p className="text-xs text-neutral-500">{carName(row)}</p>
                      </td>
                      <td>
                        <select
                          className="form-input min-w-32"
                          value={row.status}
                          onChange={(e) => updateStatus(row, e.target.value)}
                        >
                          <option value="pending">待確認</option>
                          <option value="scheduled">已排程</option>
                          <option value="working">施工中</option>
                          <option value="finished">已完工</option>
                          <option value="ready_pickup">完工待取車</option>
                          <option value="picked_up">已牽車</option>
                          <option value="cancelled">取消</option>
                        </select>
                      </td>
                      <td>{row.start_at || "-"}</td>
                      <td>{row.finish_at || "-"}</td>
                      <td>${Number(row.total_amount || 0).toLocaleString()}</td>
                      <td>
                        <p>${Number(row.paid_amount || 0).toLocaleString()}</p>
                        <p className="text-xs text-neutral-500">
                          尾款 ${Math.max(balance(row), 0).toLocaleString()}
                        </p>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-xl border border-neutral-900 px-3 py-2 text-sm font-black"
                            onClick={() => updateStatus(row, "working")}
                            disabled={row.status === "working" || row.status === "finished"}
                          >
                            開始
                          </button>
                          <button
                            className="rounded-xl bg-carcare-yellow px-3 py-2 text-sm font-black text-carcare-black"
                            onClick={() => updateStatus(row, "ready_pickup")}
                            disabled={row.status === "ready_pickup" || row.status === "picked_up"}
                          >
                            完工待取車
                          </button>
                          <button
                            className="rounded-xl border border-neutral-900 px-3 py-2 text-sm font-black"
                            onClick={() => updateStatus(row, "picked_up")}
                            disabled={row.status === "picked_up"}
                          >
                            已牽車
                          </button>
                          <button
                            className="rounded-xl border border-neutral-900 px-3 py-2 text-sm font-black"
                            onClick={() => toggleExpanded(row, isExpanded)}
                          >
                            {isExpanded ? "收合" : "完工單"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr key={`${row.id}-completion`}>
                        <td colSpan={8}>
                          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                              <div>
                                <p className="text-sm font-black text-carcare-yellow">完工確認施工單</p>
                                <h2 className="mt-1 text-2xl font-black">{row.order_no}</h2>
                                <p className="mt-1 text-sm text-neutral-500">
                                  原始報價單：{row.quotations?.quote_no || "-"}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-neutral-500">目前狀態</p>
                                <p className="text-xl font-black text-carcare-yellow">
                                  {statusText[row.status] || row.status}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl bg-neutral-50 p-4">
                                <h3 className="font-black">客戶與車輛</h3>
                                <p className="mt-3">車主：{row.cars?.customer_name || "-"}</p>
                                <p>電話：{row.cars?.customer_phone || "-"}</p>
                                <p>車牌：{row.cars?.plate_no || "-"}</p>
                                <p>車型：{carName(row)}</p>
                              </div>
                              <div className="rounded-2xl bg-neutral-50 p-4">
                                <h3 className="font-black">施工與結算</h3>
                                <p className="mt-3">開始：{row.start_at || "-"}</p>
                                <p>完工：{row.finish_at || "-"}</p>
                                <p>施工總額：${Number(row.total_amount || 0).toLocaleString()}</p>
                                <p>已收款：${Number(row.paid_amount || 0).toLocaleString()}</p>
                                <p className="font-black text-carcare-yellow">
                                  剩餘尾款：${Math.max(balance(row), 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
                              <h3 className="font-black">施工備註</h3>
                              <p className="mt-2 whitespace-pre-wrap text-neutral-700">
                                {row.remark || "尚未填寫施工備註。"}
                              </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl border border-neutral-300 p-4 text-center">
                                客戶取車簽名
                              </div>
                              <div className="rounded-2xl border border-neutral-300 p-4 text-center">
                                門市確認簽名
                              </div>
                            </div>
                          </div>
                          <div className="fixed left-[-9999px] top-0 w-[794px] bg-white">
                            <div id={`peiway-work-order-pdf-${row.id}`}>
                              <PeiwayWorkOrderPdf
                                row={row}
                                beforePhotoUrls={photoMap[row.id]?.before || []}
                                afterPhotoUrls={photoMap[row.id]?.after || []}
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="mb-3 flex flex-wrap gap-2">
                              <PhotoZipButton
                                urls={[...(photoMap[row.id]?.before || []), ...(photoMap[row.id]?.after || [])]}
                                filename={`PEIWAY_${row.cars?.plate_no || row.order_no}_${String(row.finish_at || row.start_at || new Date().toISOString()).slice(0, 10)}`}
                              />
                              <ReceiptExportButton
                                source={{
                                  quotationId: row.quotations?.id || null,
                                  orderNo: row.order_no,
                                  quoteNo: row.quotations?.quote_no || null,
                                  shopId: row.shop_id || null,
                                  customerName: row.cars?.customer_name || null,
                                  customerPhone: row.cars?.customer_phone || null,
                                  plateNo: row.cars?.plate_no || null,
                                  totalAmount: Number(row.total_amount || row.quotations?.final_amount || 0),
                                  createdAt: row.finish_at || row.start_at
                                }}
                                fallbackItems={[
                                  {
                                    name: row.remark || `施工工單 ${row.order_no}`,
                                    quantity: 1,
                                    unitPrice: Number(row.total_amount || 0),
                                    subtotal: Number(row.total_amount || 0)
                                  }
                                ]}
                              />
                            </div>
                            <button
                              type="button"
                              className="rounded-xl bg-carcare-yellow px-5 py-3 font-black text-carcare-black transition duration-200"
                              onClick={() => exportWorkOrderPdf(row)}
                              disabled={exportingId === row.id}
                            >
                              {exportingId === row.id ? "匯出中..." : "匯出施工工單PDF"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="text-center text-neutral-500">
                    尚未建立施工訂單。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

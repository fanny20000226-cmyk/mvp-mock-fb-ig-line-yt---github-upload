"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
  finish_at: string | null;
  total_amount: number | null;
  remark: string | null;
  created_at: string;
  cars?: {
    customer_name?: string | null;
    customer_phone?: string | null;
    plate_no?: string | null;
    brand?: string | null;
    model?: string | null;
  } | null;
  quotations?: {
    quote_no?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    plate_no?: string | null;
  } | null;
};

const statusText: Record<string, string> = {
  pending: "待確認",
  scheduled: "已排車",
  working: "施工中",
  finished: "已完工",
  cancelled: "已取消",
  cancel_requested: "取消待審核",
  reschedule_requested: "改期待審核"
};

function customerLabel(row: OrderRow) {
  return row.cars?.customer_name || row.quotations?.customer_name || "未命名客戶";
}

function plateLabel(row: OrderRow) {
  return row.cars?.plate_no || row.quotations?.plate_no || "-";
}

function appendRemark(row: OrderRow, message: string) {
  const current = row.remark?.trim();
  return [current, `${new Date().toLocaleString("zh-TW")} ${message}`].filter(Boolean).join("\n");
}

function latestRescheduleTime(remark?: string | null) {
  const matches = String(remark || "").match(/\[改期申請\]\s*新時間：([^\n]+)/g);
  if (!matches?.length) return "";
  return matches[matches.length - 1].replace("[改期申請] 新時間：", "").trim();
}

export default function CancellationsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState<"cancel" | "reschedule">("cancel");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("construction_orders")
      .select(`
        id,
        order_no,
        status,
        start_at,
        finish_at,
        total_amount,
        remark,
        created_at,
        cars(customer_name, customer_phone, plate_no, brand, model),
        quotations(quote_no, customer_name, customer_phone, plate_no)
      `)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
    setOrders((data || []) as OrderRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  const pendingCancel = orders.filter((order) => order.status === "cancel_requested");
  const pendingReschedule = orders.filter((order) => order.status === "reschedule_requested");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const rescheduleLogs = orders.filter((order) => String(order.remark || "").includes("[改期"));

  async function createRequest() {
    if (!selectedOrder) return alert("請先選擇訂單。");
    if (requestType === "reschedule" && !newTime) return alert("請填寫新的預約時間。");
    if (!reason.trim()) return alert("請填寫原因或備註。");

    const status = requestType === "cancel" ? "cancel_requested" : "reschedule_requested";
    const label =
      requestType === "cancel"
        ? `[取消申請] 原因：${reason}`
        : `[改期申請] 新時間：${newTime}；原因：${reason}`;

    const { error } = await supabase
      .from("construction_orders")
      .update({
        status,
        remark: appendRemark(selectedOrder, label)
      })
      .eq("id", selectedOrder.id);

    if (error) return alert(error.message);
    setSelectedOrderId("");
    setNewTime("");
    setReason("");
    load();
  }

  async function approveCancel(row: OrderRow) {
    const { error } = await supabase
      .from("construction_orders")
      .update({
        status: "cancelled",
        remark: appendRemark(row, "[取消核准] 已通過取消申請")
      })
      .eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  async function rejectRequest(row: OrderRow) {
    const reasonText = rejectReason.trim() || "未填寫駁回原因";
    const { error } = await supabase
      .from("construction_orders")
      .update({
        status: "pending",
        remark: appendRemark(row, `[申請駁回] ${reasonText}`)
      })
      .eq("id", row.id);
    if (error) return alert(error.message);
    setRejectReason("");
    load();
  }

  async function approveReschedule(row: OrderRow) {
    const nextTime = latestRescheduleTime(row.remark);
    const patch: Record<string, string | null> = {
      status: "scheduled",
      remark: appendRemark(row, `[改期核准] 新時間：${nextTime || "未指定"}`)
    };
    if (nextTime) patch.start_at = nextTime;

    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  function OrderCard({ row, actions }: { row: OrderRow; actions?: ReactNode }) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-neutral-500">{row.order_no}</p>
            <h3 className="text-lg font-black text-neutral-900">{customerLabel(row)}</h3>
            <p className="text-sm text-neutral-500">
              {plateLabel(row)} / {row.cars?.brand || ""} {row.cars?.model || ""}
            </p>
            <p className="mt-2 text-sm font-black text-carcare-yellow">
              {statusText[row.status] || row.status}
            </p>
          </div>
          <div className="text-sm text-neutral-500 md:text-right">
            <p>建立：{String(row.created_at || "").slice(0, 16).replace("T", " ")}</p>
            <p>預約：{row.start_at ? String(row.start_at).slice(0, 16).replace("T", " ") : "-"}</p>
            <p>金額：${Number(row.total_amount || 0).toLocaleString()}</p>
          </div>
        </div>
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
          {row.remark || "尚無備註紀錄"}
        </pre>
        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    );
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5">
            <p className="text-sm font-black text-carcare-yellow">預約管理</p>
            <h1 className="text-2xl font-black">取消預約 / 改期紀錄</h1>
            <p className="mt-1 text-sm text-neutral-500">
              先以現有訂單資料做審核流程：申請會保留在備註與狀態，不刪除歷史紀錄。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr]">
            <select
              className="form-input"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value as "cancel" | "reschedule")}
            >
              <option value="cancel">申請取消</option>
              <option value="reschedule">申請改期</option>
            </select>
            <select
              className="form-input"
              value={selectedOrderId}
              onChange={(event) => setSelectedOrderId(event.target.value)}
            >
              <option value="">選擇訂單</option>
              {orders
                .filter((order) => order.status !== "cancelled")
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.order_no} / {customerLabel(order)} / {plateLabel(order)}
                  </option>
                ))}
            </select>
            {requestType === "reschedule" ? (
              <input
                className="form-input"
                placeholder="新預約時間，例如 2026-07-20 14:30"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
              />
            ) : (
              <input className="form-input" value="取消申請不需填新時間" readOnly />
            )}
            <textarea
              className="form-input md:col-span-3"
              placeholder="原因 / 備註"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <button type="button" onClick={createRequest} className="primary-btn mt-4">
            建立申請
          </button>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-xl font-black">待審核取消申請</h2>
            <div className="space-y-3">
              {pendingCancel.map((row) => (
                <OrderCard
                  key={row.id}
                  row={row}
                  actions={
                    <>
                      <button type="button" onClick={() => approveCancel(row)} className="primary-btn">
                        同意取消
                      </button>
                      <button type="button" onClick={() => rejectRequest(row)} className="secondary-btn">
                        駁回
                      </button>
                    </>
                  }
                />
              ))}
              {!pendingCancel.length ? (
                <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">
                  {loading ? "讀取中..." : "目前沒有待審核取消申請"}
                </p>
              ) : null}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-black">待審核改期申請</h2>
            <div className="space-y-3">
              {pendingReschedule.map((row) => (
                <OrderCard
                  key={row.id}
                  row={row}
                  actions={
                    <>
                      <button type="button" onClick={() => approveReschedule(row)} className="primary-btn">
                        同意改期
                      </button>
                      <button type="button" onClick={() => rejectRequest(row)} className="secondary-btn">
                        駁回
                      </button>
                    </>
                  }
                />
              ))}
              {!pendingReschedule.length ? (
                <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">
                  {loading ? "讀取中..." : "目前沒有待審核改期申請"}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_260px]">
            <div>
              <h2 className="text-xl font-black">駁回原因</h2>
              <p className="mt-1 text-sm text-neutral-500">按下駁回前，可先填寫原因，系統會寫入訂單備註。</p>
            </div>
            <input
              className="form-input"
              placeholder="例如：客戶資料不足、時段已滿"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="card">
            <h2 className="mb-4 text-xl font-black">已取消訂單</h2>
            <div className="space-y-3">
              {cancelled.map((row) => (
                <OrderCard key={row.id} row={row} />
              ))}
              {!cancelled.length ? (
                <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">目前沒有已取消訂單</p>
              ) : null}
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-xl font-black">改期紀錄</h2>
            <div className="space-y-3">
              {rescheduleLogs.map((row) => (
                <OrderCard key={row.id} row={row} />
              ))}
              {!rescheduleLogs.length ? (
                <p className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">目前沒有改期紀錄</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { useUiFeedback } from "@/components/UiFeedback";
import { MoreActions } from "@/components/UiPatterns";

type OrderRow = {
  id: string;
  order_no: string;
  status: string;
  start_at: string | null;
  finish_at: string | null;
  total_amount: number | null;
  paid_amount: number | null;
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
    final_amount?: number | null;
    total_amount?: number | null;
  } | null;
};

const statusText: Record<string, string> = {
  pending: "待確認",
  scheduled: "已排車",
  working: "施工中",
  finished: "已完工",
  picked_up: "已牽車",
  cancelled: "取消",
  cancel_requested: "取消待審核",
  reschedule_requested: "改期待審核"
};
const orderStages = ["pending", "scheduled", "working", "finished", "picked_up"] as const;
function statusTone(status: string) { return status === "cancelled" ? "status-danger" : status === "finished" || status === "picked_up" ? "status-success" : status === "working" ? "status-info" : "status-neutral"; }

function downloadCsv(rows: OrderRow[]) {
  const header = ["訂單編號", "客戶", "電話", "車牌", "車型", "狀態", "總金額", "已收", "建立時間", "備註"];
  const body = rows.map((row) => {
    const car = row.cars;
    const quote = row.quotations;
    return [
      row.order_no,
      car?.customer_name || quote?.customer_name || "",
      car?.customer_phone || quote?.customer_phone || "",
      car?.plate_no || quote?.plate_no || "",
      [car?.brand, car?.model].filter(Boolean).join(" "),
      statusText[row.status] || row.status,
      String(row.total_amount || quote?.final_amount || quote?.total_amount || 0),
      String(row.paid_amount || 0),
      row.created_at,
      row.remark || ""
    ];
  });
  const csv = [header, ...body]
    .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `訂單管理_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function OrdersPage() {
  const { toast, confirm } = useUiFeedback();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

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
        paid_amount,
        remark,
        created_at,
        cars(customer_name, customer_phone, plate_no, brand, model),
        quotations(quote_no, customer_name, customer_phone, plate_no, final_amount, total_amount)
      `)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      toast(error.message, "error");
      return;
    }
    setRows((data || []) as OrderRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      const car = row.cars;
      const quote = row.quotations;
      const haystack = [
        row.order_no,
        car?.customer_name,
        car?.customer_phone,
        car?.plate_no,
        car?.brand,
        car?.model,
        quote?.quote_no,
        quote?.customer_name,
        quote?.plate_no,
        row.remark
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!status || row.status === status) && (!text || haystack.includes(text));
    });
  }, [keyword, rows, status]);

  async function updateStatus(row: OrderRow, nextStatus: string) {
    if (actionId) return;
    setActionId(row.id);
    const patch: Record<string, string | null> = { status: nextStatus };
    if (nextStatus === "working" && !row.start_at) patch.start_at = new Date().toISOString();
    if (nextStatus === "finished" && !row.finish_at) patch.finish_at = new Date().toISOString();

    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id);
    if (error) { setActionId(""); return toast(error.message, "error"); }
    toast(`訂單已更新為「${statusText[nextStatus] || nextStatus}」。`, "success");
    await load();
    setActionId("");
  }

  async function cancelOrder(row: OrderRow) {
    const ok = await confirm({ title: "取消訂單", message: `確定要取消訂單 ${row.order_no} 嗎？系統會保留紀錄，不會刪除歷史資料。`, confirmLabel: "確認取消", tone: "warning" });
    if (!ok) return;
    await updateStatus(row, "cancelled");
  }

  async function advanceOrder(row: OrderRow) {
    const current = orderStages.indexOf(row.status as (typeof orderStages)[number]);
    if (current < 0 || current >= orderStages.length - 1) return;
    await updateStatus(row, orderStages[current + 1]);
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">營運管理</p>
              <h1 className="text-2xl font-black">訂單管理</h1>
              <p className="mt-1 text-sm text-neutral-500">
                集中查看貼上填單、報價轉單與施工開單產生的所有訂單。
              </p>
            </div>
            <button type="button" onClick={() => downloadCsv(filteredRows)} className="primary-btn">
              匯出 CSV
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              className="form-input"
              placeholder="搜尋客戶、電話、車牌、訂單編號"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <select className="form-input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">全部狀態</option>
              <option value="pending">待確認</option>
              <option value="scheduled">已排車</option>
              <option value="working">施工中</option>
              <option value="finished">已完工</option>
              <option value="picked_up">已牽車</option>
              <option value="cancel_requested">取消待審核</option>
              <option value="reschedule_requested">改期待審核</option>
              <option value="cancelled">取消</option>
            </select>
            <button type="button" onClick={load} className="secondary-btn">
              重新整理
            </button>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">訂單列表</h2>
            <span className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-black text-neutral-600">
              {filteredRows.length} 筆
            </span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>訂單</th>
                  <th>客戶 / 車輛</th>
                  <th>狀態</th>
                  <th>金額</th>
                  <th>時間</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const car = row.cars;
                  const quote = row.quotations;
                  const amount = Number(row.total_amount || quote?.final_amount || quote?.total_amount || 0);
                  return (
                    <tr key={row.id}>
                      <td>
                        <p className="font-black text-neutral-900">{row.order_no}</p>
                        <p className="text-xs text-neutral-500">{quote?.quote_no || "未綁定報價"}</p>
                      </td>
                      <td>
                        <p className="font-black text-neutral-900">
                          {car?.customer_name || quote?.customer_name || "-"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {[car?.plate_no || quote?.plate_no, car?.brand, car?.model].filter(Boolean).join(" / ") || "-"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {car?.customer_phone || quote?.customer_phone || ""}
                        </p>
                      </td>
                      <td><span className={`status-chip ${statusTone(row.status)}`}>{statusText[row.status] || row.status}</span></td>
                      <td>
                        <p className="font-black text-neutral-900">${amount.toLocaleString()}</p>
                        <p className="text-xs text-neutral-500">已收 ${Number(row.paid_amount || 0).toLocaleString()}</p>
                      </td>
                      <td>
                        <p className="text-sm">{String(row.created_at || "").slice(0, 16).replace("T", " ")}</p>
                        {row.start_at ? <p className="text-xs text-neutral-500">開工 {String(row.start_at).slice(0, 16).replace("T", " ")}</p> : null}
                      </td>
                      <td className="max-w-72 whitespace-pre-wrap text-sm text-neutral-600">{row.remark || "-"}</td>
                      <td><div className="flex flex-wrap gap-2">{orderStages.includes(row.status as (typeof orderStages)[number]) && row.status !== "picked_up" ? <button type="button" disabled={Boolean(actionId)} onClick={() => advanceOrder(row)} className="primary-btn">{actionId === row.id ? <><span className="button-spinner" />處理中</> : `設為${statusText[orderStages[orderStages.indexOf(row.status as (typeof orderStages)[number]) + 1]]}`}</button> : null}{!['cancelled','picked_up'].includes(row.status) ? <MoreActions><button type="button" disabled={Boolean(actionId)} onClick={() => cancelOrder(row)} className="secondary-btn">取消訂單</button></MoreActions> : null}</div></td>
                    </tr>
                  );
                })}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={7} className="text-center text-neutral-500">
                      {loading ? "讀取中..." : "目前沒有符合條件的訂單。"}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

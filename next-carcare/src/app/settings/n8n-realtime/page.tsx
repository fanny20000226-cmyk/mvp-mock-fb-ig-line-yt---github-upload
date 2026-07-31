"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";

type TestResult = {
  ok?: boolean;
  type?: string;
  table?: string;
  record_id?: string;
  message?: string;
  n8n?: {
    ok?: boolean;
    skipped?: boolean;
    event_no?: string;
    status?: number;
    error?: string;
    response?: Record<string, unknown>;
  };
  cleanup?: {
    ok?: boolean;
    message?: string;
  } | null;
};

function resultLabel(result: TestResult | null) {
  if (!result) return "尚未測試";
  if (result.ok) return "成功";
  if (result.n8n?.skipped) return "已跳過，請先啟用 N8N";
  return "失敗";
}

function statusClass(result: TestResult | null) {
  if (!result) return "text-neutral-500";
  if (result.ok) return "text-emerald-700";
  return "text-red-700";
}

export default function N8nRealtimeTestPage() {
  const [customerResult, setCustomerResult] = useState<TestResult | null>(null);
  const [financeResult, setFinanceResult] = useState<TestResult | null>(null);
  const [loadingType, setLoadingType] = useState<"customer" | "finance" | null>(null);

  async function runTest(type: "customer" | "finance") {
    setLoadingType(type);
    try {
      const response = await fetch("/api/n8n/realtime-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = (await response.json()) as TestResult;
      if (type === "customer") setCustomerResult(data);
      if (type === "finance") setFinanceResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "測試發生未知錯誤";
      const data = { ok: false, message };
      if (type === "customer") setCustomerResult(data);
      if (type === "finance") setFinanceResult(data);
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">N8N Realtime Sync</p>
          <h1 className="text-2xl font-black">Google Sheets 即時同步測試</h1>
          <p className="mt-1 text-sm text-neutral-500">
            這裡會建立一筆測試資料，寫入 Supabase 後呼叫 N8N Webhook，再由 N8N 同步到 Google Sheets。
            測試結束後會清理系統內的測試資料，避免影響正式營運資料。
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-black text-carcare-yellow">客戶資料測試</p>
              <h2 className="text-xl font-black">測試客戶即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                產生一筆測試客戶資料，送到 N8N Webhook，讓 N8N 寫入 Google Sheets 客戶主檔分頁。
              </p>
            </div>
            <button
              type="button"
              className="primary-btn w-full"
              onClick={() => runTest("customer")}
              disabled={loadingType !== null}
            >
              {loadingType === "customer" ? "測試中..." : "測試客戶即時同步"}
            </button>
            <ResultCard result={customerResult} />
          </div>

          <div className="card space-y-4">
            <div>
              <p className="text-sm font-black text-carcare-yellow">財務資料測試</p>
              <h2 className="text-xl font-black">測試財務即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                產生一筆測試收款資料，送到 N8N Webhook，讓 N8N 寫入 Google Sheets 交易財務明細分頁。
              </p>
            </div>
            <button
              type="button"
              className="primary-btn w-full"
              onClick={() => runTest("finance")}
              disabled={loadingType !== null}
            >
              {loadingType === "finance" ? "測試中..." : "測試財務即時同步"}
            </button>
            <ResultCard result={financeResult} />
          </div>
        </section>

        <div className="card">
          <h2 className="text-xl font-black">同步判斷</h2>
          <p className="mt-2 text-sm text-neutral-600">
            測試 API 會送出 <code>event_type</code> = <code>sheet_sync_test</code>，
            並在 <code>content_params</code> 裡帶上 <code>sync_type</code>、
            <code>unique_key</code> 與完整資料欄位。N8N 依唯一 ID 判斷 Google Sheets
            裡是否已有資料，有就更新，沒有就新增。
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            如果下方顯示 N8N HTTP 200，且 N8N 執行紀錄成功，就代表「系統 → Supabase → N8N → Google Sheets」
            這條路線已經接通。
          </p>
        </div>
      </section>
    </RequireAuth>
  );
}

function ResultCard({ result }: { result: TestResult | null }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="font-black">
        測試狀態：
        <span className={statusClass(result)}>{resultLabel(result)}</span>
      </p>
      {result ? (
        <div className="mt-2 space-y-1 text-neutral-600">
          <p>寫入表格：{result.table || "-"}</p>
          <p>測試資料 ID：{result.record_id || "-"}</p>
          <p>N8N 事件編號：{result.n8n?.event_no || "-"}</p>
          <p>N8N HTTP：{result.n8n?.status || "-"}</p>
          <p>
            測試資料清理：
            {result.cleanup?.ok ? "完成" : result.cleanup ? result.cleanup.message || "清理失敗" : "-"}
          </p>
          {result.message || result.n8n?.error ? <p className="text-red-700">{result.message || result.n8n?.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

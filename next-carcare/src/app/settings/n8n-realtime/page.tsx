"use client";

import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type TestResult = {
  ok?: boolean;
  type?: string;
  table?: string;
  record_id?: string;
  message?: string;
  retained_for_n8n?: boolean;
  note?: string;
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
  if (result.n8n?.skipped) return "已略過：N8N 未啟用";
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
      const response = await authenticatedFetch("/api/n8n/realtime-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = (await response.json()) as TestResult;
      if (type === "customer") setCustomerResult(data);
      if (type === "finance") setFinanceResult(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "測試執行失敗，請稍後再試。";
      const data = { ok: false, message };
      if (type === "customer") setCustomerResult(data);
      if (type === "finance") setFinanceResult(data);
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <RequireAuth allow={["admin"]}>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">N8N Realtime Sync</p>
          <h1 className="text-2xl font-black">Google Sheets 即時同步測試</h1>
          <p className="mt-1 text-sm text-neutral-500">
            這裡會建立一筆清楚標記的測試資料，寫入 Supabase 後送出 N8N Webhook。
            測試資料會暫時保留，讓 N8N 的報表 View 可以讀到並同步到 Google Sheets。
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-black text-carcare-yellow">客戶資料</p>
              <h2 className="text-xl font-black">測試客戶即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                建立一筆 N8N 測試客戶，觸發同步至 Google Sheets「客戶主檔」分頁。
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
              <p className="text-sm font-black text-carcare-yellow">財務資料</p>
              <h2 className="text-xl font-black">測試財務即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                建立一筆 N8N 測試交易，觸發同步至 Google Sheets「交易財務明細」分頁。
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
          <h2 className="text-xl font-black">判讀方式</h2>
          <p className="mt-2 text-sm text-neutral-600">
            如果本頁顯示成功，代表系統已成功寫入 Supabase 並送出 N8N Webhook。
            接著請到 N8N execution 確認工作流成功，再到 Google Sheets 對應分頁查看測試列。
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            這次修正後，客戶測試會寫入 <code>customers</code>，財務測試會寫入{" "}
            <code>transaction_record</code>，兩張表都能被既有 N8N 報表 View 讀取。
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
        測試狀態：<span className={statusClass(result)}>{resultLabel(result)}</span>
      </p>
      {result ? (
        <div className="mt-2 space-y-1 text-neutral-600">
          <p>寫入資料表：{result.table || "-"}</p>
          <p>測試資料 ID：{result.record_id || "-"}</p>
          <p>N8N 事件編號：{result.n8n?.event_no || "-"}</p>
          <p>N8N HTTP：{result.n8n?.status || "-"}</p>
          <p>是否保留給 N8N 讀取：{result.retained_for_n8n ? "是" : "否"}</p>
          {result.note ? <p>{result.note}</p> : null}
          {result.message || result.n8n?.error ? <p className="text-red-700">{result.message || result.n8n?.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

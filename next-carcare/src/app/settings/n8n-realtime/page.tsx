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
  if (result.n8n?.skipped) return "已略過：N8N 聯動未啟用或未設定";
  return "失敗";
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
            這裡只建立臨時測試資料，送出到 N8N Webhook 後會立即清除，不會影響每日 09:00 的正式排程同步。
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="card space-y-4">
            <div>
              <p className="text-sm font-black text-carcare-yellow">客戶資料測試</p>
              <h2 className="text-xl font-black">測試客戶即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                建立一筆臨時客戶資料，送到 N8N Webhook，再清除測試資料。
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
              <p className="text-sm font-black text-carcare-yellow">財務交易測試</p>
              <h2 className="text-xl font-black">測試財務即時同步</h2>
              <p className="mt-1 text-sm text-neutral-500">
                建立一筆臨時收款資料，送到 N8N Webhook，再清除測試資料。
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
          <h2 className="text-xl font-black">N8N upsert 規則</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Webhook 會用 <code>content_params.sync_type</code> 判斷同步類型：
            <code>customer</code> 寫入客戶主檔，<code>finance</code> 寫入交易財務明細。
            試算表端請用 <code>content_params.unique_key</code> 當唯一值，有資料就更新，沒有資料才新增。
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            安全驗證請比對 <code>content_params.security_key</code> 與 Vercel 環境變數
            <code>N8N_WEBHOOK_SECRET</code>。
          </p>
        </div>
      </section>
    </RequireAuth>
  );
}

function ResultCard({ result }: { result: TestResult | null }) {
  const ok = Boolean(result?.ok);
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="font-black">
        測試狀態：
        <span className={ok ? "text-emerald-700" : result ? "text-red-700" : "text-neutral-500"}>
          {resultLabel(result)}
        </span>
      </p>
      {result ? (
        <div className="mt-2 space-y-1 text-neutral-600">
          <p>資料表：{result.table || "-"}</p>
          <p>測試資料 ID：{result.record_id || "-"}</p>
          <p>N8N 事件編號：{result.n8n?.event_no || "-"}</p>
          <p>N8N HTTP：{result.n8n?.status || "-"}</p>
          <p>
            清除測試資料：
            {result.cleanup?.ok ? "完成" : result.cleanup ? result.cleanup.message || "清除失敗" : "-"}
          </p>
          {result.message || result.n8n?.error ? <p className="text-red-700">{result.message || result.n8n?.error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

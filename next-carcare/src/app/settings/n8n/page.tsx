"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type N8nSettings = {
  webhook_url: string;
  callback_webhook_url: string;
  is_enabled: boolean;
};

type DispatchLog = {
  id: string;
  event_no: string;
  event_type: string | null;
  dispatch_status: string | null;
  response_status: number | null;
  error_message: string | null;
  dispatched_at: string | null;
};

type CallbackLog = {
  id: string;
  event_no: string;
  event_type: string | null;
  receiver: string | null;
  callback_status: string | null;
  error_note: string | null;
  callback_time: string | null;
};

type Diagnostics = {
  dispatchLogs?: { ok: boolean; rows: DispatchLog[]; message: string };
  callbackLogs?: { ok: boolean; rows: CallbackLog[]; message: string };
};

function getDefaultCallback() {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/n8n/callback`;
}

function statusClass(status?: string | null) {
  if (status === "success") return "bg-emerald-100 text-emerald-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "skipped") return "bg-neutral-200 text-neutral-700";
  return "bg-carcare-yellow/20 text-neutral-900";
}

function formatTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("zh-TW") : "-";
}

export default function N8nSettingsPage() {
  const [settings, setSettings] = useState<N8nSettings>({
    webhook_url: "",
    callback_webhook_url: "",
    is_enabled: false
  });
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState("");
  const [testReceiver, setTestReceiver] = useState("Telegram 測試群組");

  const callbackUrl = useMemo(
    () => settings.callback_webhook_url || getDefaultCallback(),
    [settings.callback_webhook_url]
  );

  async function load() {
    setLoading(true);
    setResult("");
    const defaultCallback = getDefaultCallback();
    const response = await authenticatedFetch("/api/n8n/diagnostics", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setResult(data.message || "讀取 Telegram 聯動狀態失敗。");
      setLoading(false);
      return;
    }

    setSettings({
      webhook_url: data.settings?.webhook_url || "",
      callback_webhook_url: data.settings?.callback_webhook_url || defaultCallback,
      is_enabled: Boolean(data.settings?.is_enabled)
    });
    setDiagnostics({
      dispatchLogs: data.dispatchLogs,
      callbackLogs: data.callbackLogs
    });
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    setResult("");
    const payload = {
      ...settings,
      callback_webhook_url: callbackUrl
    };
    const response = await authenticatedFetch("/api/n8n/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setResult(data.message || "儲存失敗。");
      return false;
    }
    setSettings({
      webhook_url: data.webhook_url || payload.webhook_url,
      callback_webhook_url: data.callback_webhook_url || payload.callback_webhook_url,
      is_enabled: Boolean(data.is_enabled)
    });
    setResult("設定已儲存。");
    return true;
  }

  async function testTelegram() {
    setTesting(true);
    setResult("");
    const saved = await save();
    if (!saved) {
      setTesting(false);
      return;
    }

    const response = await authenticatedFetch("/api/n8n/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        receiver: testReceiver,
        message:
          "PEIWAY Telegram 測試：如果這則訊息有出現在 Telegram，代表系統、N8N、Telegram 已經串通。"
      })
    });
    const data = await response.json();
    setTesting(false);
    setResult(
      data.ok
        ? `測試事件已送出：${data.event_no}。請到 Telegram 與下方回呼紀錄確認結果。`
        : `測試失敗：${data.message || data.error || "N8N 沒有成功回應"}`
    );
    await load();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setResult("已複製。");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireAuth allow={["admin"]}>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">Telegram Bridge</p>
          <h1 className="text-2xl font-black">Telegram / N8N 聯動檢查站</h1>
          <p className="mt-1 text-sm text-neutral-500">
            系統只送事件到 N8N，Telegram Bot Token 與群組 Chat ID 放在 N8N 裡。這一頁負責確認系統真的有送出、N8N 有沒有回傳結果。
          </p>
        </div>

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card space-y-4">
            <div className="rounded-xl border border-carcare-yellow/50 bg-carcare-yellow/10 p-4">
              <h2 className="font-black">最簡流程</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-700">
                <li>在 N8N 建立 Webhook 觸發流程，Telegram 發送節點放在 N8N。</li>
                <li>把 N8N 的 Production Webhook URL 貼到下方。</li>
                <li>打開「啟用 Telegram 聯動」，按「送 Telegram 測試」。</li>
              </ol>
            </div>

            <label className="block">
              <span className="mb-2 block font-black">N8N 接收 Webhook URL</span>
              <input
                className="form-input"
                placeholder="https://你的-n8n/webhook/peiway-telegram"
                value={settings.webhook_url}
                onChange={(event) => setSettings({ ...settings, webhook_url: event.target.value })}
              />
              <span className="mt-2 block text-xs text-neutral-500">
                建議使用 N8N Published 後的 production `/webhook/` 網址；測試中的 `/webhook-test/` 只在手動執行時有效。
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block font-black">系統回呼接收網址（貼回 N8N HTTP Request 節點）</span>
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <input className="form-input" readOnly value={callbackUrl} />
                <button type="button" className="secondary-btn" onClick={() => copy(callbackUrl)}>
                  複製
                </button>
              </div>
              <span className="mt-2 block text-xs text-neutral-500">
                N8N 發送 Telegram 成功或失敗後，POST 到這個網址，系統才會留下回呼紀錄。
              </span>
            </label>

            <label className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
              <span>
                <span className="block font-black">啟用 Telegram 聯動</span>
                <span className="text-sm text-neutral-500">
                  關閉後系統不會送任何外部通知事件，原本報價、工單、財務、人資功能照常運作。
                </span>
              </span>
              <input
                type="checkbox"
                className="h-6 w-6 accent-carcare-yellow"
                checked={settings.is_enabled}
                onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })}
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-black">測試接收人備註</span>
              <input
                className="form-input"
                value={testReceiver}
                onChange={(event) => setTestReceiver(event.target.value)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button type="button" className="primary-btn" onClick={save} disabled={loading || saving}>
                {saving ? "儲存中..." : "儲存設定"}
              </button>
              <button type="button" className="primary-btn" onClick={testTelegram} disabled={testing}>
                {testing ? "測試中..." : "送 Telegram 測試"}
              </button>
              <button type="button" className="secondary-btn" onClick={load}>
                重新整理紀錄
              </button>
            </div>

            {result ? <p className="rounded-xl bg-neutral-100 p-4 font-bold">{result}</p> : null}
          </div>

          <div className="card space-y-4">
            <h2 className="text-xl font-black">N8N 要收到的測試資料</h2>
            <pre className="overflow-auto rounded-xl bg-neutral-950 p-4 text-xs text-white">
{`{
  "event_type": "connection_test",
  "channel": "telegram",
  "receiver": "${testReceiver}",
  "message_template": "PEIWAY Telegram connection test",
  "content_params": {
    "message": "PEIWAY Telegram 測試..."
  },
  "callback_webhook_url": "${callbackUrl}"
}`}
            </pre>
            <p className="text-sm text-neutral-600">
              N8N 裡面只要讀 `content_params.message`，用 Telegram 節點或 HTTP Request 送出，最後再把結果 POST 回 `callback_webhook_url`。
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">最近送出到 N8N</h2>
              {!diagnostics.dispatchLogs?.ok ? (
                <span className="text-sm font-bold text-red-600">{diagnostics.dispatchLogs?.message}</span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-carcare-black text-white">
                  <tr>
                    <th className="p-3">事件</th>
                    <th className="p-3">類型</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3">HTTP</th>
                    <th className="p-3">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {(diagnostics.dispatchLogs?.rows || []).map((row) => (
                    <tr key={row.id} className="border-b border-neutral-200">
                      <td className="p-3 font-bold">{row.event_no}</td>
                      <td className="p-3">{row.event_type || "-"}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(row.dispatch_status)}`}>
                          {row.dispatch_status || "-"}
                        </span>
                        {row.error_message ? <p className="mt-1 text-xs text-red-600">{row.error_message}</p> : null}
                      </td>
                      <td className="p-3">{row.response_status || "-"}</td>
                      <td className="p-3">{formatTime(row.dispatched_at)}</td>
                    </tr>
                  ))}
                  {!diagnostics.dispatchLogs?.rows?.length ? (
                    <tr>
                      <td className="p-3" colSpan={5}>
                        尚未送出測試事件。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">最近 N8N 回呼</h2>
              {!diagnostics.callbackLogs?.ok ? (
                <span className="text-sm font-bold text-red-600">{diagnostics.callbackLogs?.message}</span>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-carcare-black text-white">
                  <tr>
                    <th className="p-3">事件</th>
                    <th className="p-3">接收人</th>
                    <th className="p-3">狀態</th>
                    <th className="p-3">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {(diagnostics.callbackLogs?.rows || []).map((row) => (
                    <tr key={row.id} className="border-b border-neutral-200">
                      <td className="p-3 font-bold">{row.event_no}</td>
                      <td className="p-3">{row.receiver || "-"}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass(row.callback_status)}`}>
                          {row.callback_status || "-"}
                        </span>
                        {row.error_note ? <p className="mt-1 text-xs text-red-600">{row.error_note}</p> : null}
                      </td>
                      <td className="p-3">{formatTime(row.callback_time)}</td>
                    </tr>
                  ))}
                  {!diagnostics.callbackLogs?.rows?.length ? (
                    <tr>
                      <td className="p-3" colSpan={4}>
                        尚未收到 N8N 回呼。若已送出 Telegram，請檢查 N8N 最後一個 HTTP Request 是否 POST 回系統回呼網址。
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </section>
    </RequireAuth>
  );
}

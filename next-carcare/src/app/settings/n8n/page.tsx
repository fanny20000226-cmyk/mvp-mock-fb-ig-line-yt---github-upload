"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";

type N8nSettings = {
  webhook_url: string;
  callback_webhook_url: string;
  is_enabled: boolean;
};

const defaultCallback =
  typeof window === "undefined" ? "" : `${window.location.origin}/api/n8n/callback`;

export default function N8nSettingsPage() {
  const [settings, setSettings] = useState<N8nSettings>({
    webhook_url: "",
    callback_webhook_url: defaultCallback,
    is_enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/n8n/settings", { cache: "no-store" });
    const data = await response.json();
    setSettings({
      webhook_url: data.webhook_url || "",
      callback_webhook_url: data.callback_webhook_url || defaultCallback,
      is_enabled: Boolean(data.is_enabled)
    });
    setLoading(false);
  }

  async function save() {
    setResult("");
    const response = await fetch("/api/n8n/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      setResult(data.message || "儲存失敗");
      return;
    }
    setResult("N8N 連線設定已儲存。");
    load();
  }

  async function test() {
    setTesting(true);
    setResult("");
    await save();
    const response = await fetch("/api/n8n/test", { method: "POST" });
    const data = await response.json();
    setTesting(false);
    setResult(
      data.ok
        ? `連線測試已送出，事件編號：${data.event_no}`
        : `連線測試失敗：${data.message || data.error || "N8N 未回應"}`
    );
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireAuth>
      <section className="space-y-5">
        <div className="card">
          <p className="text-sm font-black text-carcare-yellow">N8N Integration</p>
          <h1 className="text-2xl font-black">N8N 連線設定</h1>
          <p className="mt-1 text-sm text-neutral-500">
            這裡只負責把事件丟給 N8N，LINE Notify 發送邏輯全部放在 N8N 工作流內。
          </p>
        </div>

        <section className="card space-y-4">
          <div className="rounded-xl border border-carcare-yellow/40 bg-carcare-yellow/10 p-4 text-sm font-bold text-neutral-700">
            權限提示：此頁請只開放總管理員使用。關閉聯動後，系統不會呼叫任何 N8N webhook，原本訂單、報價、財務、人資功能照常運作。
          </div>

          <label className="block">
            <span className="mb-2 block font-black">N8N Webhook 網址</span>
            <input
              className="form-input"
              placeholder="https://你的-n8n/webhook/peiway-line-events"
              value={settings.webhook_url}
              onChange={(event) => setSettings({ ...settings, webhook_url: event.target.value })}
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-black">N8N 回呼 Webhook 網址</span>
            <input
              className="form-input"
              value={settings.callback_webhook_url}
              onChange={(event) =>
                setSettings({ ...settings, callback_webhook_url: event.target.value })
              }
            />
            <span className="mt-2 block text-xs text-neutral-500">
              建議填：{defaultCallback || "https://你的系統網址/api/n8n/callback"}
            </span>
          </label>

          <label className="flex items-center justify-between rounded-xl border border-neutral-200 p-4">
            <span>
              <span className="block font-black">啟用 N8N 聯動</span>
              <span className="text-sm text-neutral-500">關閉時所有事件只會在系統內記錄，不會送到 N8N。</span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6 accent-carcare-yellow"
              checked={settings.is_enabled}
              onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="button" className="primary-btn" onClick={save} disabled={loading}>
              儲存設定
            </button>
            <button type="button" className="secondary-btn" onClick={test} disabled={testing}>
              {testing ? "測試中..." : "N8N 連線測試"}
            </button>
          </div>

          {result ? <p className="rounded-xl bg-neutral-100 p-4 font-bold">{result}</p> : null}
        </section>
      </section>
    </RequireAuth>
  );
}

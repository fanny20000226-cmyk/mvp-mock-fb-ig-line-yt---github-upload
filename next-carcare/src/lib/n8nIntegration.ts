import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type N8nEventType =
  | "todo"
  | "abnormal"
  | "broadcast"
  | "connection_test"
  | "system_test"
  | "sheet_sync"
  | "sheet_sync_test";

export type N8nEventPayload = {
  event_no: string;
  event_type: N8nEventType;
  channel?: "telegram" | "sms" | "system" | "google_sheets" | string;
  store_id?: string | null;
  store_name?: string | null;
  staff_info?: Record<string, unknown> | null;
  work_order_id?: string | null;
  quotation_id?: string | null;
  plate?: string | null;
  model?: string | null;
  receiver?: string | null;
  message_template?: string | null;
  content_params?: Record<string, unknown>;
};

export type N8nCallbackPayload = {
  event_no?: string;
  event_type?: string | null;
  send_time?: string | null;
  receiver?: string | null;
  message_content?: string | null;
  message?: string | null;
  status?: string | null;
  success?: boolean | null;
  error?: string | null;
  send_status?: "success" | "failed" | "pending" | "skipped" | string;
  error_note?: string | null;
  store_id?: string | null;
  work_order_id?: string | null;
  plate?: string | null;
  model?: string | null;
  n8n_execution_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
};

type N8nSettings = {
  id: string;
  webhook_url: string | null;
  callback_webhook_url: string | null;
  is_enabled: boolean;
};

export type SheetSyncKind = "customer" | "finance";

export type SheetSyncInput = {
  sync_type: SheetSyncKind;
  source_table: "customers" | "cars" | "payment" | "transaction_record" | string;
  operation: "insert" | "update" | "upsert" | "test";
  unique_key: string;
  record: Record<string, unknown>;
  store_id?: string | null;
  store_name?: string | null;
  plate?: string | null;
  model?: string | null;
  is_test?: boolean;
};

function eventNo(prefix = "N8N") {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function n8nSecurityKey() {
  return process.env.N8N_WEBHOOK_SECRET || process.env.N8N_SECURITY_KEY || "";
}

export async function getN8nSettings() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("n8n_connection_settings")
    .select("id, webhook_url, callback_webhook_url, is_enabled")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") throw error;
  return (data || null) as N8nSettings | null;
}

export async function upsertN8nSettings(input: {
  webhook_url: string;
  callback_webhook_url: string;
  is_enabled: boolean;
}) {
  const admin = getSupabaseAdmin();
  const current = await getN8nSettings();
  const payload = {
    webhook_url: input.webhook_url.trim(),
    callback_webhook_url: input.callback_webhook_url.trim(),
    is_enabled: input.is_enabled,
    updated_at: new Date().toISOString()
  };

  if (current?.id) {
    const { data, error } = await admin
      .from("n8n_connection_settings")
      .update(payload)
      .eq("id", current.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await admin.from("n8n_connection_settings").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function writeDispatchLog(input: {
  payload: N8nEventPayload;
  dispatch_status: "success" | "failed" | "skipped";
  response_status?: number | null;
  response_body?: Record<string, unknown> | null;
  error_message?: string | null;
}) {
  const admin = getSupabaseAdmin();
  await admin.from("n8n_event_dispatch_logs").insert({
    event_no: input.payload.event_no,
    event_type: input.payload.event_type,
    store_id: input.payload.store_id || null,
    staff_info: input.payload.staff_info || {},
    work_order_id: input.payload.work_order_id || input.payload.quotation_id || null,
    plate: input.payload.plate || null,
    model: input.payload.model || null,
    content_params: input.payload.content_params || {},
    dispatch_status: input.dispatch_status,
    response_status: input.response_status || null,
    response_body: input.response_body || {},
    error_message: input.error_message || null,
    dispatched_at: new Date().toISOString()
  });
}

async function blockedByDailyDedup(payload: N8nEventPayload) {
  if (payload.event_type !== "abnormal" || !payload.work_order_id) return false;
  const admin = getSupabaseAdmin();
  const dedup_key = `${payload.work_order_id}:${payload.event_type}:${todayKey()}`;
  const { data } = await admin.from("n8n_event_dedup").select("id").eq("dedup_key", dedup_key).maybeSingle();

  if (data?.id) return true;

  await admin.from("n8n_event_dedup").insert({
    dedup_key,
    event_no: payload.event_no,
    work_order_id: payload.work_order_id,
    event_type: payload.event_type,
    last_sent_at: new Date().toISOString()
  });
  return false;
}

export async function sendEventToN8n(input: Omit<N8nEventPayload, "event_no"> & { event_no?: string }) {
  const settings = await getN8nSettings();
  const payload: N8nEventPayload = {
    ...input,
    event_no: input.event_no || eventNo(input.event_type.toUpperCase())
  };

  if (!settings?.is_enabled || !settings.webhook_url) {
    await writeDispatchLog({
      payload,
      dispatch_status: "skipped",
      error_message: "N8N integration is disabled or webhook URL is empty."
    });
    return { ok: true, skipped: true, event_no: payload.event_no };
  }

  if (await blockedByDailyDedup(payload)) {
    await writeDispatchLog({
      payload,
      dispatch_status: "skipped",
      error_message: "Daily anti-spam rule skipped duplicate abnormal event."
    });
    return { ok: true, skipped: true, event_no: payload.event_no };
  }

  const outbound = {
    ...payload,
    callback_webhook_url: settings.callback_webhook_url,
    sent_at: new Date().toISOString()
  };

  try {
    const response = await fetch(settings.webhook_url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(outbound)
    });
    const text = await response.text();
    let responseBody: Record<string, unknown> = { text };
    try {
      responseBody = JSON.parse(text) as Record<string, unknown>;
    } catch {
      responseBody = { text };
    }
    await writeDispatchLog({
      payload,
      dispatch_status: response.ok ? "success" : "failed",
      response_status: response.status,
      response_body: responseBody,
      error_message: response.ok ? null : response.statusText
    });
    return { ok: response.ok, status: response.status, event_no: payload.event_no, response: responseBody };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown N8N dispatch error";
    await writeDispatchLog({ payload, dispatch_status: "failed", error_message: message });
    return { ok: false, event_no: payload.event_no, error: message };
  }
}

export async function sendSheetSyncToN8n(input: SheetSyncInput) {
  return sendEventToN8n({
    event_type: input.is_test ? "sheet_sync_test" : "sheet_sync",
    channel: "google_sheets",
    store_id: input.store_id || null,
    store_name: input.store_name || null,
    plate: input.plate || null,
    model: input.model || null,
    receiver: input.sync_type === "customer" ? "Google Sheets 客戶主檔" : "Google Sheets 交易財務明細",
    message_template: "PEIWAY realtime Google Sheets sync",
    content_params: {
      sync_type: input.sync_type,
      source_table: input.source_table,
      operation: input.operation,
      unique_key: input.unique_key,
      sheet_name: input.sync_type === "customer" ? "客戶主檔" : "交易財務明細",
      record: input.record,
      is_test: Boolean(input.is_test),
      security_key: n8nSecurityKey()
    }
  });
}

export async function recordN8nCallback(input: N8nCallbackPayload) {
  const admin = getSupabaseAdmin();
  const eventNoValue = input.event_no || eventNo("CALLBACK");
  const sendStatus =
    input.send_status ||
    input.status ||
    (typeof input.success === "boolean" ? (input.success ? "success" : "failed") : "pending");
  const errorNote = input.error_note || input.error || "";
  const messageContent = input.message_content || input.message || "";
  const { data, error } = await admin
    .from("n8n_callback_logs")
    .insert({
      event_no: eventNoValue,
      event_type: input.event_type || null,
      callback_time: input.send_time || new Date().toISOString(),
      receiver: input.receiver || "",
      message_content: messageContent,
      callback_status: sendStatus,
      error_note: errorNote,
      store_id: input.store_id || null,
      work_order_id: input.work_order_id || null,
      plate: input.plate || null,
      model: input.model || null,
      n8n_execution_id: input.n8n_execution_id || null,
      raw_payload: input.raw_payload || input
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function testN8nConnection(input?: { receiver?: string; message?: string }) {
  return sendEventToN8n({
    event_type: "connection_test",
    channel: "system",
    store_name: "PEIWAY Test Store",
    receiver: input?.receiver || "N8N 測試接收端",
    message_template: "PEIWAY N8N connection test",
    content_params: {
      message:
        input?.message ||
        "PEIWAY 系統測試：如果 N8N 收到這筆事件，代表系統到 N8N 的 Webhook 已接通。",
      tested_at: new Date().toISOString()
    }
  });
}

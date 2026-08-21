import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type N8nEventType =
  | "todo"
  | "abnormal"
  | "broadcast"
  | "connection_test"
  | "system_test"
  | "sheet_sync"
  | "sheet_sync_test"
  | "photo_sync";

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
  max_retries?: number | null;
  retry_delay_ms?: number | null;
};

const syncStatusTables = new Set([
  "quotations",
  "customers",
  "payment",
  "transaction_record",
  "salary_records",
  "appointments",
]);

export type SheetSyncKind = "customer" | "finance" | "salary" | "employee" | "attendance" | "appointment";

export type SheetSyncInput = {
  sync_type: SheetSyncKind;
  source_table: "customers" | "cars" | "payment" | "transaction_record" | "salary_records" | "staff_info" | "employees" | "staff_attendance" | "attendance_log" | "appointments" | string;
  operation: "insert" | "update" | "upsert" | "test";
  unique_key: string;
  record: Record<string, unknown>;
  target_sheet_id?: string | null;
  store_id?: string | null;
  store_name?: string | null;
  plate?: string | null;
  model?: string | null;
  is_test?: boolean;
};

export type CustomerSheetSyncInput = {
  operation?: SheetSyncInput["operation"];
  customerId: string;
  carId?: string | null;
  shopId?: string | null;
  storeName?: string | null;
  name?: string | null;
  phone?: string | null;
  plate?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: string | number | null;
  color?: string | null;
  source?: string | null;
  extra?: Record<string, unknown>;
};

export type PhotoDriveSyncInput = {
  annotation_id: string;
  image_url: string;
  storage_path: string;
  file_name: string;
  content_type: string;
  phase: "before" | "after";
  uploaded_at: string;
  shop_id: string;
  shop_name?: string | null;
  customer_id: string;
  customer_name?: string | null;
  car_id: string;
  plate?: string | null;
  model?: string | null;
  construction_order_id: string;
  order_no?: string | null;
  quotation_id?: string | null;
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
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Missing N8N_WEBHOOK_SECRET");
  return secret;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getN8nSettings() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("n8n_connection_settings")
    .select("id, webhook_url, callback_webhook_url, is_enabled, max_retries, retry_delay_ms")
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
  attempt_count?: number;
  error_stack?: string | null;
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
    attempt_count: input.attempt_count || 1,
    error_stack: input.error_stack || null,
    dispatched_at: new Date().toISOString()
  });
  if (input.dispatch_status === "failed") {
    const { data: shop } = input.payload.store_id
      ? await admin.from("shops").select("tenant_id").eq("id", input.payload.store_id).maybeSingle()
      : { data: null };
    await admin.from("system_notifications").insert({
      tenant_id: shop?.tenant_id || null,
      shop_id: input.payload.store_id || null,
      notification_type: "sync_failed",
      severity: "error",
      title: "N8N 同步失敗",
      message: `事件 ${input.payload.event_no} 已重試 ${input.attempt_count || 1} 次：${input.error_message || "未知錯誤"}`,
      reference_type: input.payload.event_type,
      reference_id: input.payload.work_order_id || input.payload.quotation_id || input.payload.event_no
    });
  }
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

export async function sendEventToN8n(input: Omit<N8nEventPayload, "event_no"> & { event_no?: string; webhook_url_override?: string }) {
  const { webhook_url_override: webhookUrlOverride, ...eventInput } = input;
  const settings = await getN8nSettings();
  const payload: N8nEventPayload = {
    ...eventInput,
    event_no: eventInput.event_no || eventNo(eventInput.event_type.toUpperCase())
  };
  const webhookUrl = webhookUrlOverride || settings?.webhook_url || "";

  if (!settings?.is_enabled || !webhookUrl) {
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
    callback_security_key: n8nSecurityKey(),
    sent_at: new Date().toISOString()
  };

  const maxAttempts = Math.max(1, Math.min(6, Number(settings.max_retries || 3)));
  const retryDelay = Math.max(100, Math.min(10000, Number(settings.retry_delay_ms || 800)));
  const requiresSyncAck = ["sheet_sync", "sheet_sync_test", "photo_sync"].includes(payload.event_type);
  const requestTimeoutMs = payload.event_type === "photo_sync" ? 30000 : 5000;
  let finalError = "Unknown N8N dispatch error";
  let finalResponseBody: Record<string, unknown> = {};
  let finalResponseStatus: number | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        webhookUrl,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-peiway-webhook-secret": n8nSecurityKey(),
          },
          body: JSON.stringify(outbound),
        },
        requestTimeoutMs,
      );
      const text = await response.text(); let responseBody: Record<string, unknown> = { text };
      try { responseBody = JSON.parse(text) as Record<string, unknown>; } catch { responseBody = { text }; }
      finalResponseBody = responseBody;
      finalResponseStatus = response.status;
      const syncAcknowledged = responseBody.ok === true && String(responseBody.status || "").toLowerCase() === "synced";
      if (response.ok && (!requiresSyncAck || syncAcknowledged)) {
        await writeDispatchLog({ payload, dispatch_status: "success", response_status: response.status, response_body: responseBody, attempt_count: attempt });
        return { ok: true, status: response.status, event_no: payload.event_no, response: responseBody, attempts: attempt };
      }
      finalError = response.ok
        ? `N8N 未回傳同步完成確認：${String(responseBody.message || responseBody.status || text || "empty response")}`
        : `${response.status} ${response.statusText}`.trim();
      if (attempt === maxAttempts || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        await writeDispatchLog({ payload, dispatch_status: "failed", response_status: response.status, response_body: responseBody, error_message: finalError, attempt_count: attempt });
        return { ok: false, status: response.status, event_no: payload.event_no, response: responseBody, attempts: attempt };
      }
    } catch (error) {
      finalError = error instanceof Error ? error.message : finalError;
      if (attempt === maxAttempts) {
        await writeDispatchLog({ payload, dispatch_status: "failed", error_message: finalError, error_stack: error instanceof Error ? error.stack : null, attempt_count: attempt });
        return { ok: false, event_no: payload.event_no, error: finalError, attempts: attempt };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
  }
  await writeDispatchLog({ payload, dispatch_status: "failed", response_status: finalResponseStatus, response_body: finalResponseBody, error_message: finalError, attempt_count: maxAttempts });
  return { ok: false, event_no: payload.event_no, error: finalError, attempts: maxAttempts };
}

export async function sendPhotoDriveSyncToN8n(input: PhotoDriveSyncInput) {
  const settings = await getN8nSettings();
  let photoWebhookUrl = process.env.N8N_PHOTO_WEBHOOK_URL || "";
  if (!photoWebhookUrl && settings?.webhook_url) {
    try {
      const parsed = new URL(settings.webhook_url);
      const webhookPrefix = parsed.pathname.includes("/webhook-test/") ? "webhook-test" : "webhook";
      parsed.pathname = `/${webhookPrefix}/peiway-photo-drive`;
      parsed.search = "";
      parsed.hash = "";
      photoWebhookUrl = parsed.toString();
    } catch (error) {
      console.error("derive N8N photo webhook raw error", error);
    }
  }
  return sendEventToN8n({
    event_type: "photo_sync",
    channel: "google_drive",
    store_id: input.shop_id,
    store_name: input.shop_name || null,
    work_order_id: input.construction_order_id,
    quotation_id: input.quotation_id || null,
    plate: input.plate || null,
    model: input.model || null,
    receiver: "Google Drive 系統客戶照片",
    message_template: "PEIWAY work-order photo archive",
    webhook_url_override: photoWebhookUrl || undefined,
    content_params: {
      sync_type: "photo",
      operation: "upload",
      annotation_id: input.annotation_id,
      image_url: input.image_url,
      storage_path: input.storage_path,
      file_name: input.file_name,
      content_type: input.content_type,
      phase: input.phase,
      phase_name: input.phase === "after" ? "施工後" : "施工前",
      uploaded_at: input.uploaded_at,
      shop_id: input.shop_id,
      shop_name: input.shop_name || "未設定門店",
      customer_id: input.customer_id,
      customer_name: input.customer_name || "未命名客戶",
      car_id: input.car_id,
      plate: input.plate || "未填車牌",
      model: input.model || "",
      construction_order_id: input.construction_order_id,
      order_no: input.order_no || input.construction_order_id,
      quotation_id: input.quotation_id || null,
      is_test: Boolean(input.is_test),
      google_drive_root_folder_id: process.env.GOOGLE_DRIVE_PHOTO_ROOT_FOLDER_ID || "1r3-xJbC5OHkgo2ZbSY_NHCzWEEzRqmGJ",
      security_key: n8nSecurityKey()
    }
  });
}

export async function sendSheetSyncToN8n(input: SheetSyncInput) {
  const sheetName =
    input.sync_type === "customer"
      ? "客戶主檔"
      : input.sync_type === "salary"
        ? "每月薪資紀錄"
        : input.sync_type === "employee"
          ? "員工人事檔"
          : input.sync_type === "attendance"
            ? "出勤紀錄"
            : input.sync_type === "appointment"
              ? "預約紀錄"
              : "交易財務明細";
  const targetSheetId =
    input.target_sheet_id ||
    (["salary", "employee", "attendance"].includes(input.sync_type)
      ? process.env.GOOGLE_SALARY_SHEET_ID || process.env.GOOGLE_REPORT_SHEET_ID || ""
      : process.env.GOOGLE_REPORT_SHEET_ID || "");

  return sendEventToN8n({
    event_type: input.is_test ? "sheet_sync_test" : "sheet_sync",
    channel: "google_sheets",
    store_id: input.store_id || null,
    store_name: input.store_name || null,
    plate: input.plate || null,
    model: input.model || null,
    receiver: `Google Sheets ${sheetName}`,
    message_template: "PEIWAY realtime Google Sheets sync",
    content_params: {
      sync_type: input.sync_type,
      source_table: input.source_table,
      operation: input.operation,
      unique_key: input.unique_key,
      sheet_name: sheetName,
      target_sheet_id: targetSheetId,
      record: input.record,
      is_test: Boolean(input.is_test),
      security_key: n8nSecurityKey()
    }
  });
}

export async function sendEmployeeSheetSync(input: {
  operation?: SheetSyncInput["operation"];
  unique_key: string;
  record: Record<string, unknown>;
  shop_id?: string | null;
  shop_name?: string | null;
}) {
  return sendSheetSyncToN8n({
    sync_type: "employee",
    source_table: "staff_info",
    operation: input.operation || "upsert",
    unique_key: input.unique_key,
    record: {
      ...input.record,
      updated_at: new Date().toISOString()
    },
    store_id: input.shop_id || null,
    store_name: input.shop_name || null
  });
}

export async function sendAttendanceSheetSync(input: {
  operation?: SheetSyncInput["operation"];
  unique_key: string;
  record: Record<string, unknown>;
  shop_id?: string | null;
  shop_name?: string | null;
}) {
  return sendSheetSyncToN8n({
    sync_type: "attendance",
    source_table: "staff_attendance",
    operation: input.operation || "upsert",
    unique_key: input.unique_key,
    record: {
      ...input.record,
      updated_at: new Date().toISOString()
    },
    store_id: input.shop_id || null,
    store_name: input.shop_name || null
  });
}
export async function sendCustomerSheetSync(input: CustomerSheetSyncInput) {
  const record = {
    id: input.customerId,
    customer_id: input.customerId,
    car_id: input.carId || null,
    name: input.name || "\u672a\u77e5\u5ba2\u6236",
    phone: input.phone || "",
    license_plate: input.plate || "",
    plate_no: input.plate || "",
    brand: input.brand || "",
    model: input.model || "",
    year: input.year || null,
    color: input.color || "",
    store_id: input.shopId || null,
    shop_id: input.shopId || null,
    source_channel: input.source || "carcare-system",
    updated_at: new Date().toISOString(),
    ...input.extra
  };

  return sendSheetSyncToN8n({
    sync_type: "customer",
    source_table: "customers",
    operation: input.operation || "upsert",
    unique_key: input.customerId,
    record,
    store_id: input.shopId || null,
    store_name: input.storeName || null,
    plate: input.plate || null,
    model: input.model || null
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

  const raw = input.raw_payload || {};
  const params = raw.content_params && typeof raw.content_params === "object"
    ? raw.content_params as Record<string, unknown>
    : {};
  const sourceTable = String(raw.source_table || params.source_table || "");
  const uniqueKey = String(raw.unique_key || params.unique_key || "");
  if (sourceTable && uniqueKey) {
    await updateSourceSyncStatus({
      source_table: sourceTable,
      unique_key: uniqueKey,
      ok: sendStatus === "success" || sendStatus === "synced",
      error: errorNote || null,
    });
  }
  return data;
}

export async function updateSourceSyncStatus(input: {
  source_table: string;
  unique_key: string;
  ok: boolean;
  error?: string | null;
}) {
  if (!syncStatusTables.has(input.source_table) || !input.unique_key) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from(input.source_table)
    .update({
      sync_status: input.ok ? "synced" : "failed",
      last_sync_at: input.ok ? new Date().toISOString() : null,
      sync_error: input.ok ? null : input.error || "N8N 同步失敗",
    })
    .eq("id", input.unique_key);
  if (error) console.error("sync status update raw error", error);
}

export async function testN8nConnection(input?: { receiver?: string; message?: string }) {
  return sendEventToN8n({
    event_type: "connection_test",
    channel: "system",
    store_name: "PEIWAY Test Store",
    receiver: input?.receiver || "N8N 連線測試",
    message_template: "PEIWAY N8N connection test",
    content_params: {
      message: input?.message || "PEIWAY N8N 連線測試成功，代表系統可以送出 Webhook。",
      tested_at: new Date().toISOString()
    }
  });
}



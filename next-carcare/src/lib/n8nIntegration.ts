import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type N8nEventType = "todo" | "abnormal" | "broadcast" | "connection_test";

export type N8nEventPayload = {
  event_no: string;
  event_type: N8nEventType;
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
  event_no: string;
  event_type?: string | null;
  send_time?: string | null;
  receiver?: string | null;
  message_content?: string | null;
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

function eventNo(prefix = "N8N") {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
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

  const { data, error } = await admin
    .from("n8n_connection_settings")
    .insert(payload)
    .select()
    .single();
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

async function resolveLineToken(payload: N8nEventPayload) {
  const params = payload.content_params || {};
  if (typeof params.line_notify_token === "string" && params.line_notify_token) {
    return { token: params.line_notify_token, blocked: false };
  }

  const staffId =
    typeof payload.staff_info?.staff_id === "string" ? payload.staff_info.staff_id : "";
  const staffName =
    typeof payload.staff_info?.employee_name === "string"
      ? payload.staff_info.employee_name
      : typeof payload.staff_info?.name === "string"
        ? payload.staff_info.name
        : payload.receiver || "";

  if (!staffId && !staffName) return { token: "", blocked: false };

  const admin = getSupabaseAdmin();
  let query = admin
    .from("line_notify_settings")
    .select("line_notify_token, notify_todo, notify_abnormal, notify_broadcast, is_active")
    .eq("is_active", true)
    .limit(1);

  if (staffId) {
    query = query.eq("staff_id", staffId);
  } else {
    query = query.eq("employee_name", staffName);
  }

  const { data } = await query.maybeSingle();
  if (!data?.line_notify_token) return { token: "", blocked: false };

  const blocked =
    (payload.event_type === "todo" && !data.notify_todo) ||
    (payload.event_type === "abnormal" && !data.notify_abnormal) ||
    (payload.event_type === "broadcast" && !data.notify_broadcast);

  return { token: data.line_notify_token as string, blocked };
}

async function blockedByDailyDedup(payload: N8nEventPayload) {
  if (payload.event_type !== "abnormal" || !payload.work_order_id) return false;
  const admin = getSupabaseAdmin();
  const dedup_key = `${payload.work_order_id}:${payload.event_type}:${todayKey()}`;
  const { data } = await admin
    .from("n8n_event_dedup")
    .select("id")
    .eq("dedup_key", dedup_key)
    .maybeSingle();

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

  const tokenState = await resolveLineToken(payload);
  if (tokenState.blocked) {
    await writeDispatchLog({
      payload,
      dispatch_status: "skipped",
      error_message: "LINE notify switch is disabled for this employee and event type."
    });
    return { ok: true, skipped: true, event_no: payload.event_no };
  }
  if (tokenState.token) {
    payload.content_params = {
      ...(payload.content_params || {}),
      line_notify_token: tokenState.token
    };
  }

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

export async function recordN8nCallback(input: N8nCallbackPayload) {
  const admin = getSupabaseAdmin();
  const sendStatus = input.send_status || "pending";
  const { data, error } = await admin
    .from("line_notify_logs")
    .insert({
      event_no: input.event_no,
      event_type: input.event_type || null,
      send_time: input.send_time || new Date().toISOString(),
      receiver: input.receiver || "",
      message_content: input.message_content || "",
      send_status: sendStatus,
      error_note: input.error_note || "",
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

export async function testN8nConnection() {
  return sendEventToN8n({
    event_type: "connection_test",
    store_name: "PEIWAY Test Store",
    receiver: "System Admin",
    message_template: "N8N connection test",
    content_params: {
      message: "This is a PEIWAY N8N webhook connection test.",
      tested_at: new Date().toISOString()
    }
  });
}

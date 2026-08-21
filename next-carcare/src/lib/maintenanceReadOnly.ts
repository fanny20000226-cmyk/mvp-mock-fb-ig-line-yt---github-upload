import { getMaintenanceReadOnlyClient } from "@/lib/maintenanceSupabase";

type CountResult = {
  table: string;
  label: string;
  count: number;
  ok: boolean;
  error?: string;
};

type StatusResult = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  lastSync?: string | null;
  failedCount?: number;
};

type Anomaly = {
  category: string;
  ref: string;
  happenedAt: string | null;
  detail: string;
};

const countTargets = [
  { table: "customers", label: "客戶總數" },
  { table: "cars", label: "車輛檔案" },
  { table: "quotations", label: "報價單" },
  { table: "appointments", label: "預約" },
  { table: "employees", label: "員工" },
  { table: "transaction_record", label: "財務收支" }
];

const syncChannels = [
  { key: "customer", label: "客戶" },
  { key: "quotation", label: "報價" },
  { key: "salary", label: "人資薪資" },
  { key: "attendance", label: "出勤" },
  { key: "appointment", label: "預約" },
  { key: "finance", label: "財務" },
  { key: "photo", label: "施工照片" }
] as const;

type SyncChannelKey = (typeof syncChannels)[number]["key"];
type SyncLogRow = Record<string, unknown>;
type ResolvedSyncEvent = {
  channel: SyncChannelKey;
  correlationKey: string;
  eventNo: string;
  happenedAt: string | null;
  status: string;
  error: string;
  row: SyncLogRow;
};

function objectValue(value: unknown): SyncLogRow {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SyncLogRow : {};
}

function nestedLogValues(row: SyncLogRow) {
  const raw = objectValue(row.raw_payload);
  const params = {
    ...objectValue(raw.content_params),
    ...objectValue(row.content_params)
  };
  const record = {
    ...objectValue(objectValue(raw.content_params).record),
    ...objectValue(params.record)
  };
  return { raw, params, record };
}

function logTime(row: SyncLogRow) {
  const raw = row.callback_time || row.dispatched_at || row.send_time || row.created_at || row.updated_at;
  return raw ? String(raw) : null;
}

function logStatus(row: SyncLogRow) {
  return String(row.callback_status || row.dispatch_status || row.status || row.send_status || "").toLowerCase();
}

function isFailedStatus(status: string) {
  return status.includes("fail") || status.includes("error");
}

function isPendingStatus(status: string) {
  return status.includes("pending") || status.includes("queue");
}

function classifySyncChannel(row: SyncLogRow): SyncChannelKey | null {
  const { raw, params } = nestedLogValues(row);
  const eventType = String(row.event_type || raw.event_type || "").toLowerCase();
  const syncType = String(params.sync_type || raw.sync_type || "").toLowerCase();
  const sourceTable = String(params.source_table || raw.source_table || "").toLowerCase();

  if (eventType.includes("photo") || syncType === "photo") return "photo";
  if (syncType === "customer" || ["customers", "cars"].includes(sourceTable)) return "customer";
  if (["quotation", "quote", "work_order"].includes(syncType) || ["quotations", "construction_orders"].includes(sourceTable)) return "quotation";
  if (["salary", "employee", "payroll"].includes(syncType) || ["salary_records", "staff_info", "employees"].includes(sourceTable)) return "salary";
  if (syncType === "attendance" || ["staff_attendance", "attendance_log"].includes(sourceTable)) return "attendance";
  if (["appointment", "reservation"].includes(syncType) || ["appointments", "reservations"].includes(sourceTable)) return "appointment";
  if (["finance", "payment", "transaction"].includes(syncType) || ["payment", "transaction_record"].includes(sourceTable)) return "finance";

  if (eventType.includes("customer")) return "customer";
  if (eventType.includes("quotation") || eventType.includes("quote")) return "quotation";
  if (eventType.includes("salary") || eventType.includes("payroll") || eventType.includes("employee")) return "salary";
  if (eventType.includes("attendance")) return "attendance";
  if (eventType.includes("appointment") || eventType.includes("reservation")) return "appointment";
  if (eventType.includes("finance") || eventType.includes("payment")) return "finance";
  return null;
}

function isTestSyncLog(row: SyncLogRow) {
  const { raw, params, record } = nestedLogValues(row);
  if (row.is_test === true || raw.is_test === true || params.is_test === true || record.is_test === true) return true;
  const markerText = [
    row.event_no,
    params.customer_name,
    params.order_no,
    params.unique_key,
    record.name,
    record.customer_name,
    record.appointment_no,
    record.employee_no
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  return markerText.includes("monitor 測試")
    || markerText.includes("codex連動總檢查")
    || markerText.includes("cx-test")
    || markerText.includes("test-monitor")
    || markerText.includes("test-a");
}

function mergeNonEmptyRows(rows: SyncLogRow[]) {
  return rows.reduce<SyncLogRow>((merged, row) => {
    Object.entries(row).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") merged[key] = value;
    });
    return merged;
  }, {});
}

function eventCorrelationKey(row: SyncLogRow, channel: SyncChannelKey, eventNo: string) {
  const { raw, params } = nestedLogValues(row);
  const target = params.storage_path
    || params.annotation_id
    || params.unique_key
    || raw.unique_key
    || row.work_order_id
    || row.plate;
  return target ? `${channel}:${String(target)}` : `${channel}:event:${eventNo}`;
}

function resolvedSyncEvents(dispatchLogs: SyncLogRow[], callbackLogs: SyncLogRow[]) {
  const byEvent = new Map<string, SyncLogRow[]>();
  [...dispatchLogs, ...callbackLogs].forEach((row) => {
    if (isTestSyncLog(row)) return;
    const eventNo = String(row.event_no || row.id || "");
    if (!eventNo) return;
    const current = byEvent.get(eventNo) || [];
    current.push(row);
    byEvent.set(eventNo, current);
  });

  const events: ResolvedSyncEvent[] = [];
  byEvent.forEach((rows, eventNo) => {
    const ordered = [...rows].sort((a, b) => String(logTime(a) || "").localeCompare(String(logTime(b) || "")));
    const latest = ordered[ordered.length - 1];
    const merged = mergeNonEmptyRows(ordered);
    const channel = classifySyncChannel(merged);
    if (!channel) return;
    events.push({
      channel,
      correlationKey: eventCorrelationKey(merged, channel, eventNo),
      eventNo,
      happenedAt: logTime(latest),
      status: logStatus(latest),
      error: String(latest.error_message || latest.error_note || latest.error || merged.error_message || merged.error_note || "同步失敗"),
      row: merged
    });
  });

  const latestByTarget = new Map<string, ResolvedSyncEvent>();
  events.forEach((event) => {
    const current = latestByTarget.get(event.correlationKey);
    if (!current || String(event.happenedAt || "").localeCompare(String(current.happenedAt || "")) > 0) {
      latestByTarget.set(event.correlationKey, event);
    }
  });
  return Array.from(latestByTarget.values());
}

function errorMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

async function safeCount(table: string, label: string): Promise<CountResult> {
  try {
    const { count, error } = await getMaintenanceReadOnlyClient()
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return { table, label, count: count || 0, ok: true };
  } catch (error) {
    return { table, label, count: 0, ok: false, error: errorMessage(error) };
  }
}

async function safeRows<T extends Record<string, unknown>>(table: string, limit = 100): Promise<T[]> {
  try {
    const { data, error } = await getMaintenanceReadOnlyClient()
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as T[];
  } catch {
    return [];
  }
}

async function safeRowsNoOrder<T extends Record<string, unknown>>(table: string, limit = 100): Promise<T[]> {
  try {
    const { data, error } = await getMaintenanceReadOnlyClient().from(table).select("*").limit(limit);
    if (error) throw error;
    return (data || []) as T[];
  } catch {
    return [];
  }
}

async function tableConnectionStatus(): Promise<StatusResult> {
  try {
    const { error } = await getMaintenanceReadOnlyClient().from("customers").select("id", { head: true }).limit(1);
    if (error) throw error;
    return { key: "supabase", label: "Supabase資料庫", ok: true, detail: "連線正常，可讀取資料。" };
  } catch (error) {
    return { key: "supabase", label: "Supabase資料庫", ok: false, detail: errorMessage(error) || "連線失敗。" };
  }
}

async function syncStatuses(): Promise<StatusResult[]> {
  const logs = await safeRows<Record<string, unknown>>("n8n_event_dispatch_logs", 500);
  const callbacks = await safeRows<Record<string, unknown>>("n8n_callback_logs", 500);
  const resolved = resolvedSyncEvents(logs, callbacks);
  return syncChannels.map((channel) => {
    const channelEvents = resolved
      .filter((event) => event.channel === channel.key)
      .sort((a, b) => String(b.happenedAt || "").localeCompare(String(a.happenedAt || "")));
    const failed = channelEvents.filter((event) => isFailedStatus(event.status));
    const pending = channelEvents.filter((event) => isPendingStatus(event.status));
    const latest = channelEvents[0];
    const ok = failed.length === 0 && pending.length === 0;
    return {
      key: channel.key,
      label: `N8N ${channel.label}通道`,
      ok,
      detail: !latest
        ? "尚無正式同步紀錄，目前沒有未解決告警。"
        : failed.length
          ? `尚有 ${failed.length} 筆未解決同步失敗：${failed[0].error}`
          : pending.length
            ? `尚有 ${pending.length} 筆同步等待處理。`
            : "最近一次同步已完成。",
      lastSync: latest?.happenedAt || null,
      failedCount: failed.length
    };
  });
}

function near30Days(row: Record<string, unknown>) {
  const raw = row.created_at || row.updated_at;
  if (!raw) return false;
  const time = new Date(String(raw)).getTime();
  return Number.isFinite(time) && Date.now() - time <= 1000 * 60 * 60 * 24 * 30;
}

async function buildRecentStats() {
  const pairs = await Promise.all(
    countTargets.map(async (target) => ({
      ...target,
      rows: await safeRows<Record<string, unknown>>(target.table, 1000)
    }))
  );
  return pairs.map((item) => ({
    table: item.table,
    label: item.label,
    count30d: item.rows.filter(near30Days).length
  }));
}

async function detectAnomalies(): Promise<Anomaly[]> {
  const [quotes, dispatchLogs, callbackLogs, users, salaries, appointments] = await Promise.all([
    safeRows<Record<string, unknown>>("quotations", 200),
    safeRows<Record<string, unknown>>("n8n_event_dispatch_logs", 200),
    safeRows<Record<string, unknown>>("n8n_callback_logs", 200),
    safeRowsNoOrder<Record<string, unknown>>("users", 200),
    safeRows<Record<string, unknown>>("salary_records", 200),
    safeRows<Record<string, unknown>>("appointments", 200)
  ]);

  const anomalies: Anomaly[] = [];

  quotes.forEach((quote) => {
    const amount = Number(quote.total_amount ?? quote.final_amount ?? 0);
    if (!amount || amount < 0 || amount > 1000000) {
      anomalies.push({
        category: "報價單金額異常",
        ref: String(quote.quote_no || quote.order_no || quote.id || "-"),
        happenedAt: String(quote.created_at || quote.updated_at || "") || null,
        detail: `金額為 ${Number.isFinite(amount) ? amount : "非數字"}`
      });
    }
    if (!quote.customer_id || !quote.car_id) {
      anomalies.push({
        category: "預約/報價關聯斷號",
        ref: String(quote.quote_no || quote.id || "-"),
        happenedAt: String(quote.created_at || quote.updated_at || "") || null,
        detail: "報價單缺少 customer_id 或 car_id。"
      });
    }
  });

  resolvedSyncEvents(dispatchLogs, callbackLogs).forEach((event) => {
    if (isFailedStatus(event.status)) {
      anomalies.push({
        category: "N8N Webhook同步失敗",
        ref: event.eventNo,
        happenedAt: event.happenedAt,
        detail: event.error
      });
    }
  });

  users.forEach((user) => {
    const role = String(user.role || "");
    if (!["admin", "finance", "hr", "shop_manager", "vice_manager", "worker"].includes(role)) {
      anomalies.push({
        category: "員工權限設定異常",
        ref: String(user.account || user.email || user.id || "-"),
        happenedAt: String(user.created_at || user.updated_at || "") || null,
        detail: `未知角色：${role || "空白"}`
      });
    }
  });

  salaries.forEach((salary) => {
    if (salary.is_test === true) return;
    const netPay = Number(salary.net_salary ?? salary.net_pay ?? salary.actual_pay ?? salary.final_salary ?? 0);
    if (!netPay || netPay < 0 || netPay > 1000000) {
      anomalies.push({
        category: "薪資演算金額異常",
        ref: String(salary.employee_no || salary.staff_id || salary.id || "-"),
        happenedAt: String(salary.created_at || salary.updated_at || "") || null,
        detail: `實領金額為 ${Number.isFinite(netPay) ? netPay : "非數字"}`
      });
    }
  });

  appointments.forEach((appointment) => {
    if (appointment.is_test === true) return;
    if (!appointment.customer_id) {
      anomalies.push({
        category: "預約關聯斷號",
        ref: String(appointment.appointment_no || appointment.id || "-"),
        happenedAt: String(appointment.created_at || appointment.updated_at || "") || null,
        detail: "預約缺少 customer_id。"
      });
    }
  });

  return anomalies.slice(0, 120);
}

export async function readMaintenanceOverview() {
  const [databaseStatus, counts, recentStats, channelStatuses, anomalies, monitorLogs, auditLogs, backupJobs] = await Promise.all([
    tableConnectionStatus(),
    Promise.all(countTargets.map((target) => safeCount(target.table, target.label))),
    buildRecentStats(),
    syncStatuses(),
    detectAnomalies(),
    safeRows<Record<string, unknown>>("system_monitor_log", 80),
    safeRows<Record<string, unknown>>("audit_logs", 80),
    safeRows<Record<string, unknown>>("backup_jobs", 30)
  ]);

  const latestBackup = backupJobs[0];
  const backupStatus: StatusResult = {
    key: "backup",
    label: "資料庫與照片備份",
    ok: Boolean(latestBackup) && String(latestBackup?.status) === "completed",
    detail: latestBackup ? `最近備份狀態：${String(latestBackup.status)}` : "尚無備份工作紀錄。",
    lastSync: String(latestBackup?.completed_at || latestBackup?.created_at || "") || null,
    failedCount: backupJobs.filter((row) => row.status === "failed").length
  };

  const governanceLogs: Record<string, unknown>[] = auditLogs.map((row) => ({
    ...row,
    event_type: `AUDIT ${String(row.action || "")}`,
    message: `${String(row.table_name || "-")} / ${String(row.record_id || "-")} / ${JSON.stringify(row.changed_fields || [])}`
  }) as Record<string, unknown>);

  return {
    generatedAt: new Date().toISOString(),
    statuses: [databaseStatus, backupStatus, ...channelStatuses],
    counts,
    recentStats,
    anomalies,
    monitorLogs: [...governanceLogs, ...monitorLogs].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 120),
    backupJobs
  };
}

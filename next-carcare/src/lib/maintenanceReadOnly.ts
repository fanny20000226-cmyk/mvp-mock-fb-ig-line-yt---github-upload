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
  { key: "customer", label: "客戶", keyword: "customer" },
  { key: "quotation", label: "報價", keyword: "quotation" },
  { key: "salary", label: "人資薪資", keyword: "salary" },
  { key: "attendance", label: "出勤", keyword: "attendance" },
  { key: "appointment", label: "預約", keyword: "appointment" },
  { key: "finance", label: "財務", keyword: "finance" }
];

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
  return syncChannels.map((channel) => {
    const channelLogs = [...logs, ...callbacks].filter((row) => {
      const source = JSON.stringify(row).toLowerCase();
      return source.includes(channel.keyword);
    }).sort((a, b) => String(b.created_at || b.callback_time || b.send_time || b.updated_at || "").localeCompare(String(a.created_at || a.callback_time || a.send_time || a.updated_at || "")));
    const statusOf = (row: Record<string, unknown>) => String(row.status || row.dispatch_status || row.callback_status || row.send_status || "").toLowerCase();
    const failed = channelLogs.filter((row) => {
      const status = statusOf(row);
      return status.includes("fail") || status.includes("error") || status.includes("failed");
    });
    const latest = channelLogs[0];
    const latestStatus = latest ? statusOf(latest) : "";
    const latestFailed = latestStatus.includes("fail") || latestStatus.includes("error");
    const latestPending = latestStatus.includes("pending") || latestStatus.includes("queue");
    return {
      key: channel.key,
      label: `N8N ${channel.label}通道`,
      ok: Boolean(latest) && !latestFailed && !latestPending,
      detail: !latest
        ? "尚無同步紀錄，請確認 N8N 是否已接收過此類資料。"
        : latestFailed
          ? `最近一次同步失敗：${String(latest.error_message || latest.error_note || latest.error || "請至 N8N 查看詳細紀錄。")}`
          : latestPending
            ? "最近一次同步仍在等待處理。"
            : "最近一次同步已完成。",
      lastSync: String(latest?.created_at || latest?.callback_time || latest?.send_time || latest?.updated_at || "") || null,
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

  [...dispatchLogs, ...callbackLogs].forEach((log) => {
    const status = String(log.status || log.dispatch_status || log.send_status || "").toLowerCase();
    if (status.includes("fail") || status.includes("error") || status.includes("failed")) {
      anomalies.push({
        category: "N8N Webhook同步失敗",
        ref: String(log.event_no || log.id || "-"),
        happenedAt: String(log.created_at || log.send_time || "") || null,
        detail: String(log.error_message || log.error_note || log.error || "同步失敗")
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

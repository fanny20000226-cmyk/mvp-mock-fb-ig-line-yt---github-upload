import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEventToN8n } from "@/lib/n8nIntegration";
import type { Role } from "@/lib/permissions";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qhbdjeiieeiynuvlrltp.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing-supabase-anon-key";

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export type SystemTestMode = "manual" | "cron";

type StepResult = {
  key: string;
  title: string;
  status: "success" | "failed" | "skipped";
  table?: string;
  record_id?: string | null;
  message: string;
  expected?: Record<string, unknown>;
  actual?: Record<string, unknown> | null;
  missing_fields?: string[];
};

type CleanupTarget = {
  table: string;
  id: string;
};

type Profile = {
  id: string;
  shop_id: string | null;
  role: Role;
};

const allowedRoles: Role[] = ["admin", "shop_manager"];

function runNo(mode: SystemTestMode) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SYS-${mode.toUpperCase()}-${stamp}-${random}`;
}

function testData(runId: string, shopId: string | null) {
  const safeRun = runId.replace(/[^A-Z0-9-]/gi, "");
  const now = new Date();
  const reserveAt = new Date(now.getTime() + 1000 * 60 * 60 * 26).toISOString();
  const plate = `TST-${safeRun.slice(-6)}`;
  return {
    customer: {
      name: `TEST-AUTO-客戶-${safeRun.slice(-6)}`,
      phone: `09${String(Date.now()).slice(-8)}`,
      store_id: shopId,
    },
    car: {
      license_plate: plate,
      plate_no: plate,
      customer_name: `TEST-AUTO-${safeRun.slice(-6)}`,
      customer_phone: `09${String(Date.now()).slice(-8)}`,
      brand: "PEIWAY-Test",
      model: "5人座測試車",
      store_id: shopId,
      shop_id: shopId,
    },
    reservation: {
      store_id: shopId,
      reserve_datetime: reserveAt,
      project: "TEST-AUTO-資料庫傳送測試",
      status: "test",
    },
    quotation: {
      order_no: runId,
      quote_no: runId,
      store_id: shopId,
      shop_id: shopId,
      total_amount: 12345,
      final_amount: 12345,
      status: "system_test",
      customer_name: `TEST-AUTO-客戶-${safeRun.slice(-6)}`,
      customer_phone: `09${String(Date.now()).slice(-8)}`,
      plate_no: plate,
      brand: "PEIWAY-Test",
      model: "5人座測試車",
      remark: `TEST-AUTO-RUN:${runId}`,
    },
  };
}

function errorText(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

function pick(row: Record<string, unknown> | null | undefined, fields: string[]) {
  const output: Record<string, unknown> = {};
  for (const field of fields) output[field] = row?.[field] ?? null;
  return output;
}

function compareFields(
  actual: Record<string, unknown> | null | undefined,
  expected: Record<string, unknown>,
  aliases: Record<string, string[]> = {}
) {
  const missing: string[] = [];
  for (const [field, expectedValue] of Object.entries(expected)) {
    const candidates = [field, ...(aliases[field] || [])];
    const actualValue = candidates.map((candidate) => actual?.[candidate]).find((value) => value != null);
    if (actualValue == null || String(actualValue) !== String(expectedValue)) {
      missing.push(field);
    }
  }
  return missing;
}

async function insertAndRead(
  admin: AdminClient,
  table: string,
  payload: Record<string, unknown>,
  selectColumns = "*"
) {
  const { data, error } = await admin.from(table).insert(payload).select("id").single();
  if (error || !data?.id) throw error || new Error(`Insert ${table} failed`);
  const id = String(data.id);
  const { data: actual, error: readError } = await admin
    .from(table)
    .select(selectColumns)
    .eq("id", id)
    .single();
  if (readError) throw readError;
  return { id, actual: actual as unknown as Record<string, unknown> };
}

async function cleanup(admin: AdminClient, targets: CleanupTarget[]) {
  const report: StepResult[] = [];
  for (const target of [...targets].reverse()) {
    const { error } = await admin.from(target.table).delete().eq("id", target.id);
    report.push({
      key: `cleanup-${target.table}`,
      title: `清理 ${target.table}`,
      table: target.table,
      record_id: target.id,
      status: error ? "failed" : "success",
      message: error ? error.message : "測試資料已清理",
    });
  }
  return report;
}

async function resolveShopId(admin: AdminClient, preferredShopId: string | null) {
  if (preferredShopId) return preferredShopId;
  const { data } = await admin.from("shops").select("id").limit(1).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function assertSystemTestAccess(request: Request, mode: SystemTestMode) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const isCron =
    mode === "cron" &&
    (userAgent.toLowerCase().includes("vercel-cron") ||
      (Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`));

  if (isCron) {
    return { id: "vercel-cron", shop_id: null, role: "admin" as Role };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) throw new Error("請先登入後再執行資料庫傳送測試。");

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authUser, error: authError } = await client.auth.getUser(token);
  if (authError || !authUser.user?.id) throw new Error("登入狀態已失效，請重新登入。");

  const { data, error } = await client
    .from("users")
    .select("id, shop_id, role, active")
    .eq("id", authUser.user.id)
    .eq("active", true)
    .single();
  if (error || !data) throw new Error("找不到有效管理員帳號。");
  if (!allowedRoles.includes(data.role as Role)) throw new Error("只有總管理員或店長可以執行自動測試。");
  return data as Profile;
}

export async function runSystemDataTest(input: { mode: SystemTestMode; profile: Profile }) {
  const admin = getSupabaseAdmin();
  const run_id = runNo(input.mode);
  const shopId = await resolveShopId(admin, input.profile.shop_id);
  const payload = testData(run_id, shopId);
  const startedAt = new Date().toISOString();
  let runRecordId: string | null = null;
  const report: StepResult[] = [];
  const cleanupTargets: CleanupTarget[] = [];

  const { data: runRecord } = await admin
    .from("system_test_runs")
    .insert({
      run_no: run_id,
      mode: input.mode,
      status: "running",
      started_at: startedAt,
      test_payload: payload,
      summary: { started_at: startedAt },
    })
    .select("id")
    .maybeSingle();
  runRecordId = runRecord?.id || null;

  let n8nResult: Record<string, unknown> | null = null;

  try {
    const customer = await insertAndRead(admin, "customers", payload.customer);
    cleanupTargets.push({ table: "customers", id: customer.id });
    const customerMissing = compareFields(customer.actual, {
      name: payload.customer.name,
      phone: payload.customer.phone,
    });
    report.push({
      key: "customer-write",
      title: "建立測試客戶資料",
      table: "customers",
      record_id: customer.id,
      status: customerMissing.length ? "failed" : "success",
      message: customerMissing.length ? "客戶欄位比對失敗" : "客戶資料寫入成功",
      expected: payload.customer,
      actual: pick(customer.actual, ["id", "name", "phone", "store_id", "created_at", "updated_at"]),
      missing_fields: customerMissing,
    });

    const carPayload = { ...payload.car, customer_id: customer.id };
    const car = await insertAndRead(admin, "cars", carPayload);
    cleanupTargets.push({ table: "cars", id: car.id });
    const carMissing = compareFields(
      car.actual,
      {
        license_plate: payload.car.license_plate,
        brand: payload.car.brand,
        model: payload.car.model,
        customer_id: customer.id,
      },
      { license_plate: ["plate_no"] }
    );
    report.push({
      key: "car-write",
      title: "建立測試車輛資料",
      table: "cars",
      record_id: car.id,
      status: carMissing.length ? "failed" : "success",
      message: carMissing.length ? "車輛欄位比對失敗" : "車輛資料寫入成功",
      expected: carPayload,
      actual: pick(car.actual, ["id", "license_plate", "plate_no", "brand", "model", "customer_id", "store_id", "shop_id"]),
      missing_fields: carMissing,
    });

    const reservationPayload = { ...payload.reservation, car_id: car.id };
    const reservation = await insertAndRead(admin, "reservations", reservationPayload);
    cleanupTargets.push({ table: "reservations", id: reservation.id });
    const reservationMissing = compareFields(reservation.actual, {
      car_id: car.id,
      reserve_datetime: payload.reservation.reserve_datetime,
      project: payload.reservation.project,
      status: payload.reservation.status,
    });
    report.push({
      key: "reservation-write",
      title: "建立測試預約",
      table: "reservations",
      record_id: reservation.id,
      status: reservationMissing.length ? "failed" : "success",
      message: reservationMissing.length ? "預約欄位比對失敗" : "預約資料寫入成功",
      expected: reservationPayload,
      actual: pick(reservation.actual, ["id", "store_id", "car_id", "reserve_datetime", "project", "status", "created_at", "updated_at"]),
      missing_fields: reservationMissing,
    });

    const quotationPayload = {
      ...payload.quotation,
      customer_id: customer.id,
      car_id: car.id,
    };
    const quotation = await insertAndRead(admin, "quotations", quotationPayload);
    cleanupTargets.push({ table: "quotations", id: quotation.id });
    const quotationMissing = compareFields(
      quotation.actual,
      {
        order_no: run_id,
        customer_id: customer.id,
        car_id: car.id,
        total_amount: payload.quotation.total_amount,
        status: payload.quotation.status,
      },
      { order_no: ["quote_no"], total_amount: ["final_amount"] }
    );
    report.push({
      key: "quotation-write",
      title: "建立測試報價單",
      table: "quotations",
      record_id: quotation.id,
      status: quotationMissing.length ? "failed" : "success",
      message: quotationMissing.length ? "報價欄位比對失敗" : "報價資料寫入成功",
      expected: quotationPayload,
      actual: pick(quotation.actual, [
        "id",
        "order_no",
        "quote_no",
        "customer_id",
        "car_id",
        "store_id",
        "shop_id",
        "total_amount",
        "final_amount",
        "status",
        "created_at",
        "updated_at",
      ]),
      missing_fields: quotationMissing,
    });

    const n8n = await sendEventToN8n({
      event_type: "system_test",
      channel: "system",
      store_id: shopId,
      quotation_id: quotation.id,
      plate: payload.car.license_plate,
      model: payload.car.model,
      receiver: "N8N Google Sheets sync test",
      message_template: "system_data_write_test",
      content_params: {
        run_id,
        customer_id: customer.id,
        car_id: car.id,
        reservation_id: reservation.id,
        quotation_id: quotation.id,
        expected: {
          customer_name: payload.customer.name,
          phone: payload.customer.phone,
          plate: payload.car.license_plate,
          car_model: payload.car.model,
          reserve_datetime: payload.reservation.reserve_datetime,
          total_amount: payload.quotation.total_amount,
        },
      },
    });
    n8nResult = n8n as Record<string, unknown>;
    report.push({
      key: "n8n-dispatch",
      title: "呼叫 N8N 單次同步測試",
      status: n8n.ok ? "success" : "failed",
      message: n8n.ok ? "N8N Webhook 已收到測試事件" : String(n8n.error || "N8N Webhook 呼叫失敗"),
      actual: n8n as Record<string, unknown>,
    });
  } catch (error) {
    report.push({
      key: "runtime-error",
      title: "測試流程中斷",
      status: "failed",
      message: errorText(error),
    });
  }

  const cleanupReport = await cleanup(admin, cleanupTargets);
  const failed = report.filter((row) => row.status === "failed").length;
  const status = failed ? "failed" : "success";
  const finishedAt = new Date().toISOString();
  const summary = {
    mode: input.mode,
    status,
    total_steps: report.length,
    success_steps: report.filter((row) => row.status === "success").length,
    failed_steps: failed,
    cleaned_rows: cleanupReport.filter((row) => row.status === "success").length,
    started_at: startedAt,
    finished_at: finishedAt,
  };

  const finalPayload = {
    status,
    n8n_status: n8nResult?.ok ? "success" : n8nResult ? "failed" : "not_run",
    n8n_event_no: typeof n8nResult?.event_no === "string" ? n8nResult.event_no : null,
    n8n_response: n8nResult || {},
    summary,
    report,
    cleanup_report: cleanupReport,
    error_message: failed ? report.find((row) => row.status === "failed")?.message || null : null,
    finished_at: finishedAt,
  };

  if (runRecordId) {
    await admin.from("system_test_runs").update(finalPayload).eq("id", runRecordId);
  } else {
    await admin.from("system_test_runs").insert({
      run_no: run_id,
      mode: input.mode,
      test_payload: payload,
      started_at: startedAt,
      ...finalPayload,
    });
  }

  return { run_id, ...finalPayload };
}

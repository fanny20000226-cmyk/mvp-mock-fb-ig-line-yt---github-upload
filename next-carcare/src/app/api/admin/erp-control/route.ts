import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, HttpError, requireScopedShopId, requireServerProfile } from "@/lib/serverAuth";
import { sendSheetSyncToN8n, type SheetSyncKind } from "@/lib/n8nIntegration";
import type { Role, UserProfile } from "@/lib/permissions";

type Row = Record<string, unknown> & { id?: string; shop_id?: string | null; tenant_id?: string | null };
type ActionBody = Row & { action?: string; id?: string; record?: Row; sync_type?: SheetSyncKind; source_table?: string };

const managementRoles: Role[] = ["admin", "finance", "hr", "shop_manager", "vice_manager"];
const operationalRoles: Role[] = ["admin", "shop_manager", "vice_manager"];
const financeRoles: Role[] = ["admin", "finance"];

function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function asNumber(value: unknown) { const number = Number(value || 0); return Number.isFinite(number) ? number : 0; }
function now() { return new Date().toISOString(); }
function assertRole(profile: UserProfile, roles: Role[], message = "此操作權限不足。") {
  if (!roles.includes(profile.role)) throw new HttpError(403, message);
}

async function syncRecord(table: string, syncType: SheetSyncKind, record: Row) {
  const admin = getSupabaseAdmin();
  const id = asText(record.id);
  try {
    const result = await sendSheetSyncToN8n({
      sync_type: syncType,
      source_table: table,
      operation: "upsert",
      unique_key: id,
      record,
      store_id: asText(record.shop_id) || null,
      is_test: Boolean(record.is_test),
    });
    if (id && !result.skipped) {
      await admin.from(table).update({ sync_status: "synced", last_sync_at: now(), sync_error: null }).eq("id", id);
    }
    return result.skipped ? "pending" : "synced";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERP sync raw error (${table})`, error);
    if (id) await admin.from(table).update({ sync_status: "failed", sync_error: message }).eq("id", id);
    return "failed";
  }
}

async function insertAndSync(table: string, syncType: SheetSyncKind, payload: Row) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from(table).insert(payload).select().single();
  if (error) throw error;
  const sync_status = await syncRecord(table, syncType, data as Row);
  return { ...(data as Row), sync_status };
}

function scopeRows(rows: Row[] | null, profile: UserProfile) {
  if (["admin", "finance", "hr"].includes(profile.role)) return rows || [];
  return (rows || []).filter((row) => !row.shop_id || row.shop_id === profile.shop_id);
}

export async function GET(request: Request) {
  try {
    const { profile } = await requireServerProfile(request);
    if (!profile.tenant_id) throw new HttpError(403, "帳號缺少租戶資料，請通知維護人員。");
    const admin = getSupabaseAdmin();
    const tenant = profile.tenant_id;
    if (profile.role === "worker") {
      const [orders, appointments, incidents, notifications] = await Promise.all([
        admin.from("construction_orders").select("id,order_no,status,workflow_status,start_at,total_amount,responsible_staff_id").eq("tenant_id", tenant).eq("shop_id", profile.shop_id).limit(100),
        admin.from("appointments").select("id,appointment_no,appoint_date,appoint_time,service_content,status,assign_staff_ids").eq("tenant_id", tenant).eq("shop_id", profile.shop_id).gte("appoint_date", new Date().toISOString().slice(0, 10)).limit(100),
        admin.from("work_order_incidents").select("*").eq("tenant_id", tenant).eq("responsible_staff_id", profile.id).limit(100),
        admin.from("notification_center").select("*").eq("tenant_id", tenant).or(`target_user_id.eq.${profile.id},target_user_id.is.null`).limit(100),
      ]);
      return NextResponse.json({ profile, worker_view: true, orders: orders.data || [], appointments: appointments.data || [], incidents: incidents.data || [], notifications: notifications.data || [] });
    }
    if (!managementRoles.includes(profile.role)) throw new HttpError(403, "此頁面權限不足。");
    const query = (table: string) => admin.from(table).select("*").eq("tenant_id", tenant).limit(500);
    const [
      customers, summaries, timeline, followups, orders, workflow, inspections, incidents, changes,
      appointments, capacity, waitlist, closings, issues, refunds, corrections, approvals, notifications,
      shops, users, payments, quotations,
    ] = await Promise.all([
      admin.from("customers").select("*").eq("tenant_id", tenant).is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
      admin.from("customer_activity_summary").select("*").eq("tenant_id", tenant).limit(500),
      query("customer_timeline_events"), query("customer_followups"),
      admin.from("construction_orders").select("*").eq("tenant_id", tenant).order("created_at", { ascending: false }).limit(500),
      query("order_workflow_events"), query("construction_inspections"), query("work_order_incidents"), query("order_change_logs"),
      admin.from("appointments").select("*").eq("tenant_id", tenant).order("appoint_date", { ascending: false }).limit(500),
      query("appointment_capacity_rules"), query("appointment_waitlist"), query("daily_closings"), query("reconciliation_issues"),
      query("refund_records"), query("payment_corrections"), query("approval_requests"), query("notification_center"),
      admin.from("shops").select("id,name,active,tenant_id").eq("tenant_id", tenant).eq("active", true),
      admin.from("users").select("id,name,account,role,shop_id,active").eq("tenant_id", tenant).eq("active", true),
      admin.from("payment").select("*").eq("tenant_id", tenant).order("created_at", { ascending: false }).limit(500),
      admin.from("quotations").select("*").eq("tenant_id", tenant).order("created_at", { ascending: false }).limit(500),
    ]);
    const failed = [customers, summaries, timeline, followups, orders, workflow, inspections, incidents, changes, appointments, capacity, waitlist, closings, issues, refunds, corrections, approvals, notifications, shops, users, payments, quotations].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return NextResponse.json({
      profile,
      customers: scopeRows(customers.data as Row[], profile), summaries: scopeRows(summaries.data as Row[], profile),
      timeline: scopeRows(timeline.data as Row[], profile), followups: scopeRows(followups.data as Row[], profile),
      orders: scopeRows(orders.data as Row[], profile), workflow: scopeRows(workflow.data as Row[], profile),
      inspections: scopeRows(inspections.data as Row[], profile), incidents: scopeRows(incidents.data as Row[], profile),
      changes: scopeRows(changes.data as Row[], profile), appointments: scopeRows(appointments.data as Row[], profile),
      capacity: scopeRows(capacity.data as Row[], profile), waitlist: scopeRows(waitlist.data as Row[], profile),
      closings: scopeRows(closings.data as Row[], profile), issues: scopeRows(issues.data as Row[], profile),
      refunds: scopeRows(refunds.data as Row[], profile), corrections: scopeRows(corrections.data as Row[], profile),
      approvals: scopeRows(approvals.data as Row[], profile), notifications: scopeRows(notifications.data as Row[], profile),
      payments: scopeRows(payments.data as Row[], profile), quotations: scopeRows(quotations.data as Row[], profile),
      shops: shops.data || [], users: scopeRows(users.data as Row[], profile),
    });
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, managementRoles);
    if (!profile.tenant_id) throw new HttpError(403, "帳號缺少租戶資料，請通知維護人員。");
    const body = await request.json() as ActionBody;
    const action = asText(body.action);
    const admin = getSupabaseAdmin();
    const shopId = await requireScopedShopId(profile, body.shop_id);
    const base = { tenant_id: profile.tenant_id, shop_id: shopId, is_test: Boolean(body.is_test) };

    if (action === "create_followup") {
      const data = await insertAndSync("customer_followups", "followup", {
        ...base, customer_id: body.customer_id, followup_type: body.followup_type || "custom",
        due_at: body.due_at, assigned_staff_id: body.assigned_staff_id || null,
        contact_status: body.contact_status || "uncontacted", customer_reply: body.customer_reply || null,
        next_followup_at: body.next_followup_at || null, created_by: profile.id,
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === "update_workflow") {
      assertRole(profile, operationalRoles);
      const orderId = asText(body.order_id);
      const nextStatus = asText(body.next_status);
      const { data: order, error } = await admin.from("construction_orders").select("*").eq("id", orderId).eq("tenant_id", profile.tenant_id).single();
      if (error) throw error;
      const previous = asText(order.workflow_status) || asText(order.status) || "draft";
      const updated = await admin.from("construction_orders").update({ workflow_status: nextStatus }).eq("id", orderId).select().single();
      if (updated.error) throw updated.error;
      const event = await insertAndSync("order_workflow_events", "order_workflow", {
        ...base, reference_type: "construction_order", reference_id: orderId, order_no: order.order_no || null,
        from_status: previous, to_status: nextStatus, changed_by: profile.id, reason: body.reason || null,
      });
      return NextResponse.json({ ok: true, data: updated.data, event });
    }

    if (action === "inspect_order") {
      assertRole(profile, operationalRoles);
      const orderId = asText(body.order_id);
      const { data: order, error } = await admin.from("construction_orders").select("*").eq("id", orderId).eq("tenant_id", profile.tenant_id).single();
      if (error) throw error;
      const current = asText(order.workflow_status) || asText(order.status);
      if (!["pending_inspection", "待驗收"].includes(current)) throw new HttpError(409, "施工單必須先進入待驗收狀態。");
      const passed = body.result === "passed";
      const inspection = await insertAndSync("construction_inspections", "inspection", {
        ...base, construction_order_id: orderId, inspector_id: profile.id, inspected_at: now(), result: passed ? "passed" : "failed",
        defect_description: body.defect_description || null, defect_photos: body.defect_photo_urls || [],
        rework_required: !passed,
      });
      await admin.from("construction_orders").update({ workflow_status: passed ? "pending_payment" : "in_progress", inspection_status: passed ? "passed" : "failed" }).eq("id", orderId);
      return NextResponse.json({ ok: true, data: inspection });
    }

    if (action === "create_incident") {
      assertRole(profile, operationalRoles);
      const data = await insertAndSync("work_order_incidents", "incident", {
        ...base, construction_order_id: body.order_id, incident_type: body.incident_type || "other", occurred_at: body.occurred_at || now(),
        discovered_by: profile.id, responsible_staff_id: body.responsible_staff_id || null,
        description: body.incident_note || "未填寫異常說明", photos: body.photo_urls || [], deduct_amount: asNumber(body.deduct_amount),
        include_in_payroll: Boolean(body.include_in_payroll), handled: false,
      });
      await admin.from("notification_center").insert({
        tenant_id: profile.tenant_id, shop_id: shopId, notification_type: "work_incident", severity: "warning",
        title: "施工異常待處理", message: asText(body.incident_note) || "施工單新增異常紀錄。",
        visible_roles: ["admin", "shop_manager", "hr"], target_user_id: body.responsible_staff_id || null,
        reference_type: "construction_order", reference_id: body.order_id || null, reference_url: "/enterprise/control?tab=workflow",
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === "save_capacity") {
      assertRole(profile, operationalRoles);
      const payload = { ...base, shop_id: shopId, weekday: asNumber(body.weekday), start_time: body.start_time, end_time: body.end_time, staff_capacity: asNumber(body.staff_capacity) || 1, max_orders: asNumber(body.max_orders) || 1, estimated_hours: asNumber(body.estimated_hours) || 1, active: body.active !== false, created_by: profile.id };
      const existing = await admin.from("appointment_capacity_rules").select("id").eq("shop_id", shopId).eq("weekday", payload.weekday).eq("start_time", payload.start_time).eq("end_time", payload.end_time).maybeSingle();
      const result = existing.data?.id
        ? await admin.from("appointment_capacity_rules").update(payload).eq("id", existing.data.id).select().single()
        : await admin.from("appointment_capacity_rules").insert(payload).select().single();
      if (result.error) throw result.error;
      await syncRecord("appointment_capacity_rules", "capacity", result.data as Row);
      return NextResponse.json({ ok: true, data: result.data });
    }

    if (action === "add_waitlist") {
      assertRole(profile, operationalRoles);
      const data = await insertAndSync("appointment_waitlist", "waitlist", {
        ...base, shop_id: shopId, customer_id: body.customer_id || null, customer_name: body.customer_name,
        customer_phone: body.customer_phone || null, license_plate: body.license_plate || null,
        requested_date: body.requested_date, requested_time: body.requested_time, service_content: body.service_content || null,
        priority: asNumber(body.priority) || 100, status: "waiting", created_by: profile.id,
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === "prepare_closing") {
      assertRole(profile, ["admin", "shop_manager"]);
      const businessDate = asText(body.business_date) || new Date().toISOString().slice(0, 10);
      const { data: paymentRows, error } = await admin.from("payment").select("*").eq("tenant_id", profile.tenant_id).eq("shop_id", shopId).gte("created_at", `${businessDate}T00:00:00`).lt("created_at", `${businessDate}T23:59:59.999`);
      if (error) throw error;
      const valid = (paymentRows || []).filter((row) => !row.is_test && !row.is_void);
      const totals = valid.reduce((sum, row) => {
        const amount = asNumber(row.amount || row.paid_amount);
        const method = asText(row.payment_method || row.pay_method).toLowerCase();
        sum.received += amount;
        if (method.includes("現金") || method === "cash") sum.cash += amount;
        else if (method.includes("刷卡") || method === "card") sum.card += amount;
        else if (method.includes("匯") || method === "transfer") sum.transfer += amount;
        else sum.other += amount;
        return sum;
      }, { received: 0, cash: 0, card: 0, transfer: 0, other: 0 });
      const payload = { ...base, shop_id: shopId, business_date: businessDate, status: "manager_pending", order_count: valid.length, receivable_amount: totals.received, received_amount: totals.received, system_cash: totals.cash, system_transfer: totals.transfer, system_card: totals.card, system_other: totals.other, snapshot: { payment_ids: valid.map((row) => row.id) } };
      const existing = await admin.from("daily_closings").select("id").eq("shop_id", shopId).eq("business_date", businessDate).maybeSingle();
      const result = existing.data?.id ? await admin.from("daily_closings").update(payload).eq("id", existing.data.id).select().single() : await admin.from("daily_closings").insert(payload).select().single();
      if (result.error) throw result.error;
      await syncRecord("daily_closings", "closing", result.data as Row);
      return NextResponse.json({ ok: true, data: result.data });
    }

    if (action === "manager_close") {
      assertRole(profile, ["admin", "shop_manager"]);
      const result = await admin.from("daily_closings").update({ status: "finance_pending", manager_closed_by: profile.id, manager_closed_at: now() }).eq("id", body.id).eq("tenant_id", profile.tenant_id).select().single();
      if (result.error) throw result.error;
      await syncRecord("daily_closings", "closing", result.data as Row);
      return NextResponse.json({ ok: true, data: result.data });
    }

    if (action === "finance_reconcile") {
      assertRole(profile, financeRoles);
      const { data: closing, error } = await admin.from("daily_closings").select("*").eq("id", body.id).eq("tenant_id", profile.tenant_id).single();
      if (error) throw error;
      const actualCash = asNumber(body.actual_cash), actualTransfer = asNumber(body.actual_transfer), actualCard = asNumber(body.actual_card);
      const difference = actualCash + actualTransfer + actualCard - asNumber(closing.system_cash) - asNumber(closing.system_transfer) - asNumber(closing.system_card);
      const status = difference === 0 ? "finance_reconciled" : "finance_exception";
      const result = await admin.from("daily_closings").update({ status, actual_cash: actualCash, actual_transfer: actualTransfer, actual_card: actualCard, variance_amount: difference, finance_checked_by: profile.id, finance_checked_at: now(), finance_note: body.reason || null }).eq("id", body.id).select().single();
      if (result.error) throw result.error;
      if (difference !== 0) await insertAndSync("reconciliation_issues", "closing", { ...base, closing_id: body.id, variance_amount: difference, reason: body.reason || "系統帳與實收不一致", status: "open", created_by: profile.id });
      await syncRecord("daily_closings", "closing", result.data as Row);
      return NextResponse.json({ ok: true, data: result.data });
    }

    if (action === "submit_approval") {
      const data = await insertAndSync("approval_requests", "approval", {
        ...base, action_type: body.action_type, reference_type: body.reference_type, reference_id: body.reference_id || null,
        request_payload: body.request_payload || {}, reason: body.reason, requested_by: profile.id, status: "pending",
      });
      return NextResponse.json({ ok: true, data });
    }

    if (action === "review_approval") {
      assertRole(profile, ["admin", "shop_manager", "finance"]);
      const approved = body.decision === "approved";
      const result = await admin.from("approval_requests").update({ status: approved ? "approved" : "rejected", reviewed_by: profile.id, reviewed_at: now(), review_reason: body.review_note || null, executed_at: approved ? now() : null }).eq("id", body.id).eq("tenant_id", profile.tenant_id).select().single();
      if (result.error) throw result.error;
      await syncRecord("approval_requests", "approval", result.data as Row);
      return NextResponse.json({ ok: true, data: result.data });
    }

    if (action === "retry_sync") {
      assertRole(profile, ["admin", "finance", "hr", "shop_manager"]);
      const table = asText(body.source_table), id = asText(body.id);
      const allowed = new Set(["customer_followups", "order_workflow_events", "construction_inspections", "work_order_incidents", "appointment_capacity_rules", "appointment_waitlist", "daily_closings", "refund_records", "approval_requests", "notification_center"]);
      if (!allowed.has(table)) throw new HttpError(400, "不支援的同步資料表。");
      const row = await admin.from(table).select("*").eq("id", id).eq("tenant_id", profile.tenant_id).single();
      if (row.error) throw row.error;
      const status = await syncRecord(table, body.sync_type || "analytics", row.data as Row);
      return NextResponse.json({ ok: status !== "failed", status });
    }

    if (action === "mark_notification") {
      const result = await admin.from("notification_center").update({ read_at: now() }).eq("id", body.id).eq("tenant_id", profile.tenant_id).select().single();
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true, data: result.data });
    }

    throw new HttpError(400, "不支援的 ERP 控制操作。");
  } catch (error) {
    const result = apiError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}

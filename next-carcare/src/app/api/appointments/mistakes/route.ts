import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, updateSourceSyncStatus } from "@/lib/n8nIntegration";
import { apiError, requireServerProfile } from "@/lib/serverAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const allowedRoles = ["admin", "hr", "shop_manager", "vice_manager"] as const;

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, [...allowedRoles]);
    const body = (await request.json()) as {
      appointment_id?: string;
      employee_no?: string;
      mistake_type?: string;
      description?: string;
      deduct_amount?: number;
    };
    const appointmentId = String(body.appointment_id || "").trim();
    const employeeNo = String(body.employee_no || "").trim();
    const mistakeType = String(body.mistake_type || "").trim();
    const description = String(body.description || "").trim();
    const deductAmount = Math.max(0, Number(body.deduct_amount || 0));
    if (!appointmentId || !employeeNo || !mistakeType || !description) {
      return NextResponse.json({ ok: false, message: "請完整填寫排程、員工、缺失類型與說明。" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const [{ data: appointment, error: appointmentError }, { data: staff, error: staffError }] = await Promise.all([
      admin.from("appointments").select("id, appointment_no, shop_id, store_id, assign_staff_ids").eq("id", appointmentId).single(),
      admin.from("staff_info").select("id, employee_no, name, shop_id").eq("employee_no", employeeNo).eq("resigned", false).single(),
    ]);
    if (appointmentError || !appointment) throw appointmentError || new Error("找不到排程資料。");
    if (staffError || !staff) throw staffError || new Error("找不到員工資料。");
    const shopId = String(appointment.shop_id || appointment.store_id || "") || null;
    if (profile.role !== "admin" && profile.role !== "hr" && profile.shop_id && shopId !== profile.shop_id) {
      return NextResponse.json({ ok: false, message: "無權限登記其他門市的缺失。" }, { status: 403 });
    }
    const assigned = Array.isArray(appointment.assign_staff_ids) ? appointment.assign_staff_ids.map(String) : [];
    if (assigned.length && !assigned.includes(employeeNo)) {
      return NextResponse.json({ ok: false, message: "此員工尚未指派至該筆排程。" }, { status: 400 });
    }

    const { data, error } = await admin.from("staff_mistake_record").insert({
      appointment_id: appointment.id,
      appointment_no: appointment.appointment_no,
      employee_no: employeeNo,
      staff_id: staff.id,
      shop_id: shopId,
      mistake_type: mistakeType,
      description,
      deduct_amount: deductAmount,
      created_by: profile.id,
      sync_status: "pending",
    }).select("*").single();
    if (error) throw error;

    await admin.from("system_monitor_log").insert({
      event_type: "staff_mistake_created",
      reference_id: String(data.id),
      detail: {
        appointment_id: appointment.id,
        appointment_no: appointment.appointment_no,
        employee_no: employeeNo,
        mistake_type: mistakeType,
        deduct_amount: deductAmount,
      },
    }).then(() => undefined, (logError) => console.error("monitor log raw error", logError));

    let syncOk = false;
    let syncError: string | null = null;
    try {
      const result = await sendSheetSyncToN8n({
        sync_type: "staff_mistake",
        source_table: "staff_mistake_record",
        operation: "insert",
        unique_key: String(data.id),
        record: data as Record<string, unknown>,
        store_id: shopId,
      });
      syncOk = Boolean(result.ok);
      syncError = syncOk ? null : "N8N 員工缺失同步失敗";
    } catch (syncFailure) {
      syncError = syncFailure instanceof Error ? syncFailure.message : "N8N 員工缺失同步失敗";
      console.error("staff mistake N8N raw error", syncFailure);
    }
    await updateSourceSyncStatus({ source_table: "staff_mistake_record", unique_key: String(data.id), ok: syncOk, error: syncError });
    return NextResponse.json({ ok: true, record: data, sync_status: syncOk ? "synced" : "failed", sync_error: syncError });
  } catch (error) {
    const parsed = apiError(error);
    return NextResponse.json({ ok: false, message: parsed.message }, { status: parsed.status });
  }
}

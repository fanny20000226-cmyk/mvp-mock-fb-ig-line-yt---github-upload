import { NextResponse } from "next/server";
import { hasMaintenanceSession } from "@/lib/maintenanceAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendSheetSyncToN8n, type SheetSyncKind } from "@/lib/n8nIntegration";
import { errorMessageZh } from "@/lib/errorMessageZh";

const employeeNo = "TEST-MONITOR-001";

export async function POST(request: Request) {
  if (!hasMaintenanceSession()) return NextResponse.json({ ok: false, message: "請先登入維護平台。" }, { status: 401 });
  try {
    const { action } = await request.json() as { action?: string };
    const admin = getSupabaseAdmin();
    const { data: shop } = await admin.from("shops").select("id, name").limit(1).maybeSingle();
    if (!shop?.id && action !== "cleanup") throw new Error("測試前需至少建立一間門市。");
    const shopId = shop?.id || null;
    const shopName = shop?.name || "Monitor 測試門市";
    const ensureEmployee = async () => {
      const { error } = await admin.from("staff_info").upsert({ employee_no: employeeNo, password_hash: "TEST-ONLY", name: "Monitor 測試員工", shop_id: shopId, position: "technician", is_test: true }, { onConflict: "employee_no" });
      if (error) throw error;
    };
    if (action === "employee") {
      const { data, error } = await admin.from("staff_info").upsert({ employee_no: employeeNo, password_hash: "TEST-ONLY", name: "Monitor 測試員工", shop_id: shopId, position: "technician", is_test: true }, { onConflict: "employee_no" }).select().single();
      if (error) throw error; return NextResponse.json({ ok: true, message: "測試員工已建立。", data });
    }
    if (action === "attendance") {
      await ensureEmployee();
      const workDate = new Date().toISOString().slice(0, 10);
      const { data, error } = await admin.from("staff_attendance").insert({
        employee_no: employeeNo,
        work_date: workDate,
        clock_in_at: new Date(`${workDate}T09:00:00+08:00`).toISOString(),
        clock_out_at: new Date(`${workDate}T18:00:00+08:00`).toISOString(),
        is_test: true
      }).select().single();
      if (error) throw error; return NextResponse.json({ ok: true, message: "測試出勤已建立。", data });
    }
    if (action === "salary") {
      await ensureEmployee();
      const { data, error } = await admin.from("salary_records").insert({ salary_month: new Date().toISOString().slice(0, 7), employee_no: employeeNo, shop_id: shopId, shop_name: shopName, position: "technician", base_salary: 30000, gross_amount: 30000, deduction_amount: 0, net_salary: 30000, is_test: true }).select().single();
      if (error) throw error; return NextResponse.json({ ok: true, message: "測試薪資單已建立。", data });
    }
    if (action === "appointment") {
      const stamp = Date.now();
      const { data: customer } = await admin.from("customers").select("id").limit(1).maybeSingle();
      const { data, error } = await admin.from("appointments").insert({ appointment_no: `TEST-A${stamp}`, customer_id: customer?.id || null, customer_name: "Monitor 測試客戶", customer_phone: "0900000000", license_plate: "TEST-001", appoint_date: new Date().toISOString().slice(0, 10), appoint_time: "10:00", service_content: "Monitor 測試預約", shop_id: shopId, store_id: shopId, is_test: true }).select().single();
      if (error) throw error; return NextResponse.json({ ok: true, message: "測試預約已建立。", data });
    }
    if (action === "sync") {
      const [employeeResult, attendanceResult, salaryResult, appointmentResult] = await Promise.all([
        admin.from("staff_info").select("*").eq("is_test", true).limit(1).maybeSingle(),
        admin.from("staff_attendance").select("*").eq("is_test", true).limit(1).maybeSingle(),
        admin.from("salary_records").select("*").eq("is_test", true).limit(1).maybeSingle(),
        admin.from("appointments").select("*").eq("is_test", true).limit(1).maybeSingle()
      ]);
      const lookupErrors = [employeeResult.error, attendanceResult.error, salaryResult.error, appointmentResult.error].filter(Boolean);
      if (lookupErrors.length) throw lookupErrors[0];
      const targets: Array<{ label: string; sync_type: SheetSyncKind; source_table: string; record: Record<string, unknown> | null }> = [
        { label: "員工", sync_type: "employee", source_table: "staff_info", record: employeeResult.data },
        { label: "出勤", sync_type: "attendance", source_table: "staff_attendance", record: attendanceResult.data },
        { label: "薪資", sync_type: "salary", source_table: "salary_records", record: salaryResult.data },
        { label: "預約", sync_type: "appointment", source_table: "appointments", record: appointmentResult.data }
      ];
      const missing = targets.filter((target) => !target.record).map((target) => target.label);
      if (missing.length) throw new Error(`請先建立測試${missing.join("、測試")}資料。`);
      const results = await Promise.all(targets.map(async (target) => ({
        type: target.sync_type,
        label: target.label,
        result: await sendSheetSyncToN8n({
          sync_type: target.sync_type,
          source_table: target.source_table,
          operation: "test",
          unique_key: String(target.record!.id ?? target.record!.employee_no ?? ""),
          record: target.record!,
          store_id: shopId,
          store_name: shopName,
          is_test: true
        })
      })));
      const failed = results.filter((item) => !item.result.ok);
      return NextResponse.json({
        ok: failed.length === 0,
        message: failed.length === 0
          ? "員工、出勤、薪資與預約測試資料皆已送出 Google。"
          : `${failed.map((item) => item.label).join("、")}同步送出失敗。`,
        results
      }, { status: failed.length === 0 ? 200 : 502 });
    }
    if (action === "cleanup") {
      const tables = ["staff_attendance", "salary_records", "appointments", "staff_info"];
      for (const table of tables) { const { error } = await admin.from(table).delete().eq("is_test", true); if (error) throw error; }
      return NextResponse.json({ ok: true, message: "全部測試資料已清理；正式資料未受影響。" });
    }
    return NextResponse.json({ ok: false, message: "未知的測試動作。" }, { status: 400 });
  } catch (error) {
    console.error("maintenance test-data raw error", error);
    return NextResponse.json({ ok: false, message: errorMessageZh(error, "測試資料操作失敗。") }, { status: 500 });
  }
}

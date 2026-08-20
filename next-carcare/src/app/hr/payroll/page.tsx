"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import SalaryPdfButton from "@/components/SalaryPdfButton";
import { getCurrentProfile } from "@/lib/auth";
import { calcSalaryTotals, money, type StaffInfo, type StaffModifyRequest, type StaffSalary } from "@/lib/staff";
import { supabase } from "@/lib/supabase";
import { errorMessageZh } from "@/lib/errorMessageZh";
import SyncStatusBadge from "@/components/SyncStatusBadge";
import { SearchSelect } from "@/components/UiPatterns";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type ShopRow = { id: string; name: string };
type AttendanceRow = {
  id: string;
  employee_no: string;
  work_date: string;
  late_minutes: number;
  leave_type: string | null;
  leave_hours: number;
  overtime_hours: number;
};

const positionOptions = ["admin", "hr", "shop_manager", "vice_manager", "frontdesk", "technician", "worker"];
const incomeFields = [
  ["base_salary", "本薪"],
  ["position_allowance", "職務津貼"],
  ["meal_allowance", "伙食津貼"],
  ["attendance_bonus", "全勤獎金"],
  ["overtime_pay", "加班費"],
  ["transport_allowance", "交通津貼"],
  ["incentive_bonus", "激勵獎金"],
  ["dispatch_allowance", "外派支援津貼"],
  ["unused_leave_pay", "應休未休"],
  ["mentor_bonus", "帶人金"],
  ["performance_bonus", "績效獎金"],
  ["sales_bonus", "業績獎金"]
] as const;
const deductionFields = [
  ["labor_insurance_fee", "勞保費（員工自付）"],
  ["health_insurance_fee", "健保費（員工自付）"],
  ["pension_self_pay", "勞退自提"],
  ["sick_leave_deduction", "事病假扣款"],
  ["advance_payment", "預支"],
  ["kip_penalty", "KPI 未達標扣款"]
] as const;
const editableRequestFields = ["phone", "mailing_address", "email", "emergency_contact", "emergency_phone", "avatar_url"] as const;

type SalaryField = (typeof incomeFields)[number][0] | (typeof deductionFields)[number][0] | "overtime_hours" | "overtime_rate" | "leave_days" | "leave_day_rate";
type SalaryForm = Record<SalaryField, string> & {
  employee_no: string;
  salary_month: string;
};

function emptySalaryForm(): SalaryForm {
  return {
    employee_no: "",
    salary_month: new Date().toISOString().slice(0, 7),
    base_salary: "0",
    position_allowance: "0",
    meal_allowance: "0",
    attendance_bonus: "0",
    overtime_hours: "0",
    overtime_rate: "0",
    overtime_pay: "0",
    transport_allowance: "0",
    incentive_bonus: "0",
    dispatch_allowance: "0",
    unused_leave_pay: "0",
    mentor_bonus: "0",
    performance_bonus: "0",
    sales_bonus: "0",
    labor_insurance_fee: "0",
    health_insurance_fee: "0",
    pension_self_pay: "0",
    leave_days: "0",
    leave_day_rate: "0",
    sick_leave_deduction: "0",
    advance_payment: "0",
    kip_penalty: "0"
  };
}

export default function PayrollPage() {
  const [profileRole, setProfileRole] = useState("");
  const [profileShopId, setProfileShopId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffInfo[]>([]);
  const [salaryRows, setSalaryRows] = useState<StaffSalary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [modifyRows, setModifyRows] = useState<StaffModifyRequest[]>([]);
  const [syncMessage, setSyncMessage] = useState("");
  const [staffForm, setStaffForm] = useState({
    employee_no: "",
    password_hash: "",
    name: "",
    shop_id: "",
    position: "technician",
    phone: "",
    identity_info: "",
    id_number: "",
    household_address: "",
    mailing_address: "",
    email: "",
    emergency_contact: "",
    emergency_phone: "",
    bank_account: "",
    bank_branch: "",
    hire_date: "",
    base_salary_default: "0",
    position_allowance_default: "0",
    meal_allowance_default: "0",
    transport_allowance_default: "0",
    overtime_rate_default: "0",
    leave_day_rate_default: "0"
  });
  const [salaryForm, setSalaryForm] = useState<SalaryForm>(emptySalaryForm());
  const [attendanceForm, setAttendanceForm] = useState({
    employee_no: "",
    work_date: new Date().toISOString().slice(0, 10),
    clock_in_at: "",
    clock_out_at: "",
    late_minutes: "0",
    leave_type: "",
    leave_hours: "0",
    overtime_hours: "0"
  });

  const isHrAdmin = ["admin", "hr"].includes(profileRole);
  const canViewShop = ["shop_manager", "vice_manager"].includes(profileRole);

  const selectedStaff = useMemo(
    () => staffRows.find((staff) => staff.employee_no === salaryForm.employee_no),
    [salaryForm.employee_no, staffRows]
  );
  const salaryTotals = useMemo(() => {
    const raw = Object.fromEntries(
      Object.entries(salaryForm).map(([key, value]) => [key, Number(value || 0)])
    ) as Record<SalaryField, number>;
    return calcSalaryTotals(raw);
  }, [salaryForm]);

  async function load() {
    const profile = await getCurrentProfile();
    setProfileRole(profile?.role || "");
    setProfileShopId(profile?.shop_id || null);
    setProfileId(profile?.id || null);

    const [shopResult, staffResult, salaryResult, attendanceResult, modifyResult] = await Promise.all([
      supabase.from("shops").select("id, name").order("name"),
      supabase.from("staff_info").select("*").order("employee_no", { ascending: true }),
      supabase.from("salary_records").select("*").order("salary_month", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("staff_attendance").select("id, employee_no, work_date, late_minutes, leave_type, leave_hours, overtime_hours").order("work_date", { ascending: false }).limit(80),
      supabase.from("staff_info_modify_request").select("*").order("requested_at", { ascending: false }).limit(80)
    ]);

    const allStaff = (staffResult.data || []) as StaffInfo[];
    const scopedStaff =
      profile?.role === "admin" || profile?.role === "hr"
        ? allStaff
        : allStaff.filter((staff) => staff.shop_id === profile?.shop_id);
    const scopedNos = new Set(scopedStaff.map((staff) => staff.employee_no));

    setShops((shopResult.data || []) as ShopRow[]);
    setStaffRows(scopedStaff);
    setSalaryRows(((salaryResult.data || []) as StaffSalary[]).filter((row) => scopedNos.has(row.employee_no)));
    setAttendanceRows(((attendanceResult.data || []) as AttendanceRow[]).filter((row) => scopedNos.has(row.employee_no)));
    setModifyRows(((modifyResult.data || []) as StaffModifyRequest[]).filter((row) => !row.employee_no || scopedNos.has(row.employee_no)));
  }

  useEffect(() => {
    load();
  }, []);

  function fillSalaryDefaults(employeeNo: string) {
    const staff = staffRows.find((row) => row.employee_no === employeeNo);
    setSalaryForm((current) => ({
      ...current,
      employee_no: employeeNo,
      base_salary: String(staff?.base_salary_default || 0),
      position_allowance: String(staff?.position_allowance_default || 0),
      meal_allowance: String(staff?.meal_allowance_default || 0),
      transport_allowance: String(staff?.transport_allowance_default || 0),
      overtime_rate: String(staff?.overtime_rate_default || 0),
      leave_day_rate: String(staff?.leave_day_rate_default || 0)
    }));
  }

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin) return alert("只有總管理員或人資可以新增員工。");
    const payload = {
      ...staffForm,
      shop_id: staffForm.shop_id || profileShopId,
      hire_date: staffForm.hire_date || null,
      base_salary_default: Number(staffForm.base_salary_default || 0),
      position_allowance_default: Number(staffForm.position_allowance_default || 0),
      meal_allowance_default: Number(staffForm.meal_allowance_default || 0),
      transport_allowance_default: Number(staffForm.transport_allowance_default || 0),
      overtime_rate_default: Number(staffForm.overtime_rate_default || 0),
      leave_day_rate_default: Number(staffForm.leave_day_rate_default || 0),
      created_by: profileId,
      resigned: false
    };
    const { data, error } = await supabase.from("staff_info").insert(payload).select("*").single();
    if (error) return alert(errorMessageZh(error, "薪資單建檔失敗。"));
    try {
      const shopName = shops.find((shop) => shop.id === data.shop_id)?.name || "";
      void authenticatedFetch("/api/hr/employee-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unique_key: data.employee_no,
          record: {
            ...data,
            real_name: data.name,
            status: data.resigned ? "離職" : "在職",
            base_salary: data.base_salary_default,
            allowance: data.position_allowance_default
          },
          shop_id: data.shop_id,
          shop_name: shopName,
          operation: "insert"
        })
      }).catch(() => {
        // N8N 同步失敗不阻擋員工建檔。
      });
    } catch {
      // N8N 同步失敗不阻擋員工建檔。
    }
    setStaffForm({
      employee_no: "",
      password_hash: "",
      name: "",
      shop_id: "",
      position: "technician",
      phone: "",
      identity_info: "",
      id_number: "",
      household_address: "",
      mailing_address: "",
      email: "",
      emergency_contact: "",
      emergency_phone: "",
      bank_account: "",
      bank_branch: "",
      hire_date: "",
      base_salary_default: "0",
      position_allowance_default: "0",
      meal_allowance_default: "0",
      transport_allowance_default: "0",
      overtime_rate_default: "0",
      leave_day_rate_default: "0"
    });
    await load();
  }

  async function saveSalary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSyncMessage("");
    if (!isHrAdmin) return alert("只有總管理員或人資可以建立薪資單。");
    if (!selectedStaff) return alert("請先選擇員工。");
    const shopName = shops.find((shop) => shop.id === selectedStaff.shop_id)?.name || "";
    const totals = salaryTotals;
    const payload = {
      salary_month: salaryForm.salary_month,
      employee_no: selectedStaff.employee_no,
      shop_id: selectedStaff.shop_id,
      shop_name: shopName,
      position: selectedStaff.position,
      base_salary: Number(salaryForm.base_salary || 0),
      position_allowance: Number(salaryForm.position_allowance || 0),
      meal_allowance: Number(salaryForm.meal_allowance || 0),
      attendance_bonus: Number(salaryForm.attendance_bonus || 0),
      overtime_hours: Number(salaryForm.overtime_hours || 0),
      overtime_rate: Number(salaryForm.overtime_rate || 0),
      overtime_pay: totals.overtime_pay,
      transport_allowance: Number(salaryForm.transport_allowance || 0),
      incentive_bonus: Number(salaryForm.incentive_bonus || 0),
      dispatch_allowance: Number(salaryForm.dispatch_allowance || 0),
      unused_leave_pay: Number(salaryForm.unused_leave_pay || 0),
      mentor_bonus: Number(salaryForm.mentor_bonus || 0),
      performance_bonus: Number(salaryForm.performance_bonus || 0),
      sales_bonus: Number(salaryForm.sales_bonus || 0),
      labor_insurance_fee: Number(salaryForm.labor_insurance_fee || 0),
      health_insurance_fee: Number(salaryForm.health_insurance_fee || 0),
      pension_self_pay: Number(salaryForm.pension_self_pay || 0),
      leave_days: Number(salaryForm.leave_days || 0),
      leave_day_rate: Number(salaryForm.leave_day_rate || 0),
      sick_leave_deduction: totals.sick_leave_deduction,
      advance_payment: Number(salaryForm.advance_payment || 0),
      kip_penalty: Number(salaryForm.kip_penalty || 0),
      gross_amount: totals.gross_amount,
      deduction_amount: totals.deduction_amount,
      net_salary: totals.net_salary,
      created_by: profileId
    };

    const { data, error } = await supabase.from("salary_records").insert(payload).select("*").single();
    if (error) return alert(error.message);

    try {
      const response = await authenticatedFetch("/api/hr/salary-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unique_key: data.id,
          record: {
            ...data,
            staff_name: selectedStaff.name,
            employee_phone: selectedStaff.phone || ""
          },
          shop_id: selectedStaff.shop_id,
          shop_name: shopName
        })
      });
      const syncResult = (await response.json().catch(() => ({}))) as { message?: string };
      await supabase.from("salary_records").update({ sync_status: response.ok ? "synced" : "failed", last_sync_at: response.ok ? new Date().toISOString() : null, sync_error: response.ok ? null : syncResult.message || "N8N 同步失敗" }).eq("id", data.id);
      setSyncMessage(response.ok ? "同步狀態：已送出 N8N 雲端薪資同步。" : `同步狀態：失敗｜${errorMessageZh(syncResult.message, "請到 N8N 紀錄檢查。")}`);
    } catch {
      setSyncMessage("同步狀態：待重試｜N8N 暫時無法連線；薪資建檔資料不受影響。");
    }

    setSalaryForm(emptySalaryForm());
    await load();
  }

  async function createAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin) return alert("只有總管理員或人資可以登記出勤。");
    const { data, error } = await supabase.from("staff_attendance").insert({
      employee_no: attendanceForm.employee_no,
      work_date: attendanceForm.work_date,
      clock_in_at: attendanceForm.clock_in_at || null,
      clock_out_at: attendanceForm.clock_out_at || null,
      late_minutes: Number(attendanceForm.late_minutes || 0),
      leave_type: attendanceForm.leave_type || null,
      leave_hours: Number(attendanceForm.leave_hours || 0),
      overtime_hours: Number(attendanceForm.overtime_hours || 0)
    }).select("*").single();
    if (error) return alert(error.message);
    try {
      const staff = staffRows.find((row) => row.employee_no === data.employee_no);
      const shopName = shops.find((shop) => shop.id === staff?.shop_id)?.name || "";
      void authenticatedFetch("/api/hr/attendance-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          unique_key: data.id,
          record: {
            ...data,
            staff_name: staff?.name || "",
            type: data.leave_type ? "請假" : Number(data.late_minutes || 0) > 0 ? "遲到" : Number(data.overtime_hours || 0) > 0 ? "加班" : "出勤"
          },
          shop_id: staff?.shop_id || null,
          shop_name: shopName,
          operation: "insert"
        })
      }).catch(() => {
        // N8N 同步失敗不阻擋出勤登記。
      });
    } catch {
      // N8N 同步失敗不阻擋出勤登記。
    }
    await load();
  }

  async function reviewRequest(row: StaffModifyRequest, status: "approved" | "rejected") {
    if (!isHrAdmin) return alert("只有總管理員或人資可以審核資料變更。");
    if (status === "approved" && !editableRequestFields.includes(row.field_name as (typeof editableRequestFields)[number])) {
      return alert("此欄位不開放員工自行申請變更。");
    }
    if (status === "approved") {
      const { error: updateError } = await supabase
        .from("staff_info")
        .update({ [row.field_name]: row.new_value })
        .eq("id", row.staff_id);
      if (updateError) return alert(updateError.message);
    }
    const { error } = await supabase
      .from("staff_info_modify_request")
      .update({
        review_status: status,
        reviewer_id: profileId,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", row.id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">HR Payroll</p>
          <h1 className="text-2xl font-black">人資薪資作業</h1>
          <p className="mt-1 text-sm text-neutral-500">
            建立員工人事資料、出勤紀錄與薪資單。薪資永久存入系統，並送出 N8N 備份至 Google 雲端薪資表。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Summary title="員工總數" value={staffRows.length} />
          <Summary title="薪資紀錄" value={salaryRows.length} />
          <Summary title="出勤紀錄" value={attendanceRows.length} />
          <Summary title="待審申請" value={modifyRows.filter((row) => row.review_status === "pending").length} />
        </section>

        {isHrAdmin ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={createStaff} className="card space-y-3">
              <h2 className="text-xl font-black">員工人事建檔</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="form-input" required placeholder="員工編號" value={staffForm.employee_no} onChange={(event) => setStaffForm({ ...staffForm, employee_no: event.target.value })} />
                <input className="form-input" required type="password" placeholder="登入密碼" value={staffForm.password_hash} onChange={(event) => setStaffForm({ ...staffForm, password_hash: event.target.value })} />
                <input className="form-input" required placeholder="姓名" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} />
                <input className="form-input" placeholder="聯絡手機" value={staffForm.phone} onChange={(event) => setStaffForm({ ...staffForm, phone: event.target.value })} />
                <select className="form-input" value={staffForm.shop_id} onChange={(event) => setStaffForm({ ...staffForm, shop_id: event.target.value })}>
                  <option value="">選擇門市</option>
                  {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                </select>
                <select className="form-input" value={staffForm.position} onChange={(event) => setStaffForm({ ...staffForm, position: event.target.value })}>
                  {positionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input className="form-input" type="date" value={staffForm.hire_date} onChange={(event) => setStaffForm({ ...staffForm, hire_date: event.target.value })} />
                <input className="form-input" placeholder="身分資訊" value={staffForm.identity_info} onChange={(event) => setStaffForm({ ...staffForm, identity_info: event.target.value })} />
                <input className="form-input" placeholder="身分證字號" value={staffForm.id_number} onChange={(event) => setStaffForm({ ...staffForm, id_number: event.target.value })} />
                <input className="form-input" placeholder="戶籍地址" value={staffForm.household_address} onChange={(event) => setStaffForm({ ...staffForm, household_address: event.target.value })} />
                <input className="form-input" placeholder="通訊地址" value={staffForm.mailing_address} onChange={(event) => setStaffForm({ ...staffForm, mailing_address: event.target.value })} />
                <input className="form-input" placeholder="電子信箱" value={staffForm.email} onChange={(event) => setStaffForm({ ...staffForm, email: event.target.value })} />
                <input className="form-input" placeholder="緊急聯絡人" value={staffForm.emergency_contact} onChange={(event) => setStaffForm({ ...staffForm, emergency_contact: event.target.value })} />
                <input className="form-input" placeholder="緊急聯絡電話" value={staffForm.emergency_phone} onChange={(event) => setStaffForm({ ...staffForm, emergency_phone: event.target.value })} />
                <input className="form-input" placeholder="銀行帳號" value={staffForm.bank_account} onChange={(event) => setStaffForm({ ...staffForm, bank_account: event.target.value })} />
                <input className="form-input" placeholder="銀行分行名稱" value={staffForm.bank_branch} onChange={(event) => setStaffForm({ ...staffForm, bank_branch: event.target.value })} />
                <input className="form-input" type="number" placeholder="底薪預設值" value={staffForm.base_salary_default} onChange={(event) => setStaffForm({ ...staffForm, base_salary_default: event.target.value })} />
                <input className="form-input" type="number" placeholder="職務津貼預設值" value={staffForm.position_allowance_default} onChange={(event) => setStaffForm({ ...staffForm, position_allowance_default: event.target.value })} />
                <input className="form-input" type="number" placeholder="伙食津貼預設值" value={staffForm.meal_allowance_default} onChange={(event) => setStaffForm({ ...staffForm, meal_allowance_default: event.target.value })} />
                <input className="form-input" type="number" placeholder="交通津貼預設值" value={staffForm.transport_allowance_default} onChange={(event) => setStaffForm({ ...staffForm, transport_allowance_default: event.target.value })} />
                <input className="form-input" type="number" placeholder="加班時薪預設值" value={staffForm.overtime_rate_default} onChange={(event) => setStaffForm({ ...staffForm, overtime_rate_default: event.target.value })} />
                <input className="form-input" type="number" placeholder="事病假每日扣款預設值" value={staffForm.leave_day_rate_default} onChange={(event) => setStaffForm({ ...staffForm, leave_day_rate_default: event.target.value })} />
              </div>
              <button className="primary-btn" type="submit">新增員工</button>
            </form>

            <form onSubmit={saveSalary} className="card space-y-3">
              <h2 className="text-xl font-black">建立薪資單</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <SearchSelect label="員工" required value={salaryForm.employee_no} onChange={fillSalaryDefaults} placeholder="搜尋姓名或員工編號" options={staffRows.map((staff) => ({ value: staff.employee_no, label: `${staff.name} / ${staff.employee_no}`, keywords: staff.position || "" }))} />
                <label className="space-y-1 text-sm font-black text-neutral-700">
                  <span>薪資年月</span>
                  <input className="form-input" type="month" value={salaryForm.salary_month} onChange={(event) => setSalaryForm({ ...salaryForm, salary_month: event.target.value })} />
                </label>
                <SalaryNumberField label="加班時數" value={salaryForm.overtime_hours} onChange={(value) => setSalaryForm({ ...salaryForm, overtime_hours: value })} />
                <SalaryNumberField label="加班時薪" value={salaryForm.overtime_rate} onChange={(value) => setSalaryForm({ ...salaryForm, overtime_rate: value })} />
                <SalaryNumberField label="事病假天數" value={salaryForm.leave_days} onChange={(value) => setSalaryForm({ ...salaryForm, leave_days: value })} />
                <SalaryNumberField label="事病假每日扣款" value={salaryForm.leave_day_rate} onChange={(value) => setSalaryForm({ ...salaryForm, leave_day_rate: value })} />
              </div>
              <h3 className="font-black">應給加項</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {incomeFields.map(([field, label]) => (
                  <SalaryNumberField
                    key={field}
                    label={label}
                    value={field === "overtime_pay" ? String(salaryTotals.overtime_pay) : salaryForm[field]}
                    onChange={(value) => setSalaryForm({ ...salaryForm, [field]: value })}
                    readOnly={field === "overtime_pay"}
                  />
                ))}
              </div>
              <h3 className="font-black">應扣減項</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {deductionFields.map(([field, label]) => (
                  <SalaryNumberField
                    key={field}
                    label={label}
                    value={field === "sick_leave_deduction" ? String(salaryTotals.sick_leave_deduction) : salaryForm[field]}
                    onChange={(value) => setSalaryForm({ ...salaryForm, [field]: value })}
                    readOnly={field === "sick_leave_deduction"}
                  />
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <TotalCard title="應給總額" value={salaryTotals.gross_amount} />
                <TotalCard title="應扣總額" value={salaryTotals.deduction_amount} />
                <TotalCard title="實領金額" value={salaryTotals.net_salary} important />
              </div>
              {syncMessage ? <p role="status" className="rounded-xl border border-carcare-yellow bg-carcare-yellow/10 p-3 text-sm font-bold">{syncMessage}</p> : null}
              <button className="primary-btn" type="submit">儲存薪資單並同步雲端</button>
            </form>
          </section>
        ) : null}

        {isHrAdmin ? (
          <section className="card">
            <h2 className="text-xl font-black">出勤登記</h2>
            <form onSubmit={createAttendance} className="mt-4 grid gap-3 md:grid-cols-4">
              <SearchSelect label="員工" required value={attendanceForm.employee_no} onChange={(value) => setAttendanceForm({ ...attendanceForm, employee_no: value })} placeholder="搜尋姓名或員工編號" options={staffRows.map((staff) => ({ value: staff.employee_no, label: `${staff.name} / ${staff.employee_no}`, keywords: staff.position || "" }))} />
              <input className="form-input" type="date" value={attendanceForm.work_date} onChange={(event) => setAttendanceForm({ ...attendanceForm, work_date: event.target.value })} />
              <input className="form-input" placeholder="上班時間" value={attendanceForm.clock_in_at} onChange={(event) => setAttendanceForm({ ...attendanceForm, clock_in_at: event.target.value })} />
              <input className="form-input" placeholder="下班時間" value={attendanceForm.clock_out_at} onChange={(event) => setAttendanceForm({ ...attendanceForm, clock_out_at: event.target.value })} />
              <input className="form-input" type="number" placeholder="遲到分鐘" value={attendanceForm.late_minutes} onChange={(event) => setAttendanceForm({ ...attendanceForm, late_minutes: event.target.value })} />
              <input className="form-input" placeholder="請假類型" value={attendanceForm.leave_type} onChange={(event) => setAttendanceForm({ ...attendanceForm, leave_type: event.target.value })} />
              <input className="form-input" type="number" placeholder="請假時數" value={attendanceForm.leave_hours} onChange={(event) => setAttendanceForm({ ...attendanceForm, leave_hours: event.target.value })} />
              <input className="form-input" type="number" placeholder="加班時數" value={attendanceForm.overtime_hours} onChange={(event) => setAttendanceForm({ ...attendanceForm, overtime_hours: event.target.value })} />
              <button className="primary-btn md:col-span-4" type="submit">新增出勤紀錄</button>
            </form>
          </section>
        ) : null}

        <section className="card">
          <h2 className="text-xl font-black">員工總檔</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {staffRows.map((staff) => (
              <div key={staff.employee_no} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{staff.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{staff.employee_no} / {staff.position}</p>
                <p className="mt-1 text-sm text-neutral-500">{staff.phone || "-"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">員工資料變更申請審核</h2>
          <div className="mt-4 space-y-3">
            {modifyRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{row.employee_no || row.staff_id} / {row.field_name}</p>
                <p className="mt-1 text-sm text-neutral-600">新內容：{row.new_value}</p>
                <p className="mt-1 text-sm text-neutral-500">狀態：{row.review_status}</p>
                {isHrAdmin && row.review_status === "pending" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="primary-btn" onClick={() => reviewRequest(row, "approved")}>核准</button>
                    <button type="button" className="secondary-btn" onClick={() => reviewRequest(row, "rejected")}>駁回</button>
                  </div>
                ) : null}
              </div>
            ))}
            {!modifyRows.length ? <p className="text-neutral-500">目前沒有資料變更申請。</p> : null}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">薪資歷史建檔紀錄</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="p-3">員工</th>
                  <th className="p-3">薪資年月</th>
                  <th className="p-3">應給總額</th>
                  <th className="p-3">應扣總額</th>
                  <th className="p-3">實領金額</th>
                  <th className="p-3">同步狀態</th>
                  <th className="p-3">PDF</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map((salary) => {
                  const staff = staffRows.find((item) => item.employee_no === salary.employee_no);
                  return (
                    <tr key={salary.id} className="border-b border-neutral-200">
                      <td className="p-3">{staff?.name || salary.employee_no}</td>
                      <td className="p-3">{salary.salary_month}</td>
                      <td className="p-3">{money(salary.gross_amount)}</td>
                      <td className="p-3">{money(salary.deduction_amount)}</td>
                      <td className="p-3 font-black text-carcare-yellow">{money(salary.net_salary)}</td>
                      <td className="p-3"><SyncStatusBadge table="salary_records" row={salary as StaffSalary & Record<string, unknown>} syncType="salary" isAdmin={profileRole === "admin"} onChanged={load} /></td>
                      <td className="p-3">{staff ? <SalaryPdfButton staff={staff} salary={salary} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!salaryRows.length ? <p className="p-6 text-center text-neutral-500">目前沒有薪資建檔紀錄。</p> : null}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">出勤紀錄</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attendanceRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{row.employee_no} / {row.work_date}</p>
                <p className="text-sm text-neutral-600">遲到 {row.late_minutes || 0} 分鐘 / 請假 {row.leave_type || "-"} {row.leave_hours || 0} 小時 / 加班 {row.overtime_hours || 0} 小時</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

function Summary({ title, value }: { title: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-carcare-yellow">{value}</p>
    </div>
  );
}

function TotalCard({ title, value, important }: { title: string; value: number; important?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${important ? "bg-carcare-black text-white" : "bg-neutral-50"}`}>
      <p className="text-sm opacity-70">{title}</p>
      <p className="mt-2 text-2xl font-black text-carcare-yellow">{money(value)}</p>
    </div>
  );
}

function SalaryNumberField({
  label,
  value,
  onChange,
  readOnly
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="block rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition duration-200 focus-within:border-carcare-yellow">
      <span className="mb-2 flex items-center justify-between text-sm font-black text-neutral-800">
        {label}
        {readOnly ? <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-500">自動</span> : null}
      </span>
      <input
        className="form-input text-base font-black"
        type="number"
        inputMode="decimal"
        min="0"
        aria-label={label}
        placeholder={`輸入${label}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        readOnly={readOnly}
      />
      {readOnly ? <span className="mt-2 block text-xs font-normal text-neutral-500">系統依時數與費率自動計算，不需手動填寫。</span> : null}
    </label>
  );
}



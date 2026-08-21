"use client";

import { supabase } from "./supabase";

export type StaffInfo = {
  id: string;
  employee_no: string;
  password_hash?: string;
  name: string;
  shop_id: string | null;
  position: string;
  phone?: string | null;
  identity_info?: string | null;
  id_number?: string | null;
  household_address?: string | null;
  mailing_address?: string | null;
  email?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
  bank_account?: string | null;
  bank_branch?: string | null;
  avatar_url?: string | null;
  hire_date?: string | null;
  probation_end_date?: string | null;
  labor_insurance_status?: string | null;
  labor_health_no?: string | null;
  contract_end_date?: string | null;
  base_salary_default?: number | null;
  position_allowance_default?: number | null;
  meal_allowance_default?: number | null;
  transport_allowance_default?: number | null;
  overtime_rate_default?: number | null;
  leave_day_rate_default?: number | null;
  created_by?: string | null;
  resigned: boolean;
};

export type StaffModifyRequest = {
  id: string;
  staff_id: string;
  employee_no?: string | null;
  field_name: string;
  new_value: string;
  request_note?: string | null;
  requested_at: string;
  review_status: "pending" | "approved" | "rejected";
  reviewer_id?: string | null;
  review_note?: string | null;
  reviewed_at?: string | null;
};

export type StaffSalary = {
  id: string;
  salary_month: string;
  employee_no: string;
  shop_id?: string | null;
  shop_name?: string | null;
  position?: string | null;
  base_salary: number;
  position_allowance: number;
  meal_allowance: number;
  attendance_bonus: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_pay: number;
  transport_allowance: number;
  incentive_bonus: number;
  dispatch_allowance: number;
  unused_leave_pay: number;
  mentor_bonus: number;
  performance_bonus: number;
  sales_bonus: number;
  labor_insurance_fee: number;
  health_insurance_fee: number;
  pension_self_pay: number;
  leave_days: number;
  leave_day_rate: number;
  sick_leave_deduction: number;
  advance_payment: number;
  kip_penalty: number;
  mistake_deduction: number;
  gross_amount: number;
  deduction_amount: number;
  net_salary: number;
  created_by?: string | null;
  created_at: string;
  sync_status?: "synced" | "pending" | "failed" | null;
  last_sync_at?: string | null;
  sync_error?: string | null;
  is_test?: boolean;
};

export type StaffAttendance = {
  id: string;
  employee_no: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  late_minutes: number;
  leave_type: string | null;
  leave_hours: number;
  overtime_hours: number;
};

export type StaffMistakeRecord = {
  id: string;
  appointment_id: string;
  appointment_no?: string | null;
  employee_no: string;
  mistake_type: string;
  description: string;
  deduct_amount: number;
  occurred_at: string;
  is_settled: boolean;
  settled_salary_id?: string | null;
  sync_status?: "synced" | "pending" | "failed" | null;
  last_sync_at?: string | null;
  sync_error?: string | null;
};

export type SalaryTotalsInput = Partial<
  Pick<
    StaffSalary,
    | "base_salary"
    | "position_allowance"
    | "meal_allowance"
    | "attendance_bonus"
    | "overtime_hours"
    | "overtime_rate"
    | "overtime_pay"
    | "transport_allowance"
    | "incentive_bonus"
    | "dispatch_allowance"
    | "unused_leave_pay"
    | "mentor_bonus"
    | "performance_bonus"
    | "sales_bonus"
    | "labor_insurance_fee"
    | "health_insurance_fee"
    | "pension_self_pay"
    | "leave_days"
    | "leave_day_rate"
    | "sick_leave_deduction"
    | "advance_payment"
    | "kip_penalty"
    | "mistake_deduction"
  >
>;

const staffSessionKey = "peiway-staff-session";

function n(value: unknown) {
  return Number(value || 0);
}

export function calcSalaryTotals(input: SalaryTotalsInput) {
  const overtimePay = n(input.overtime_pay) || n(input.overtime_hours) * n(input.overtime_rate);
  const leaveDeduction = n(input.sick_leave_deduction) || n(input.leave_days) * n(input.leave_day_rate);
  const grossAmount =
    n(input.base_salary) +
    n(input.position_allowance) +
    n(input.meal_allowance) +
    n(input.attendance_bonus) +
    overtimePay +
    n(input.transport_allowance) +
    n(input.incentive_bonus) +
    n(input.dispatch_allowance) +
    n(input.unused_leave_pay) +
    n(input.mentor_bonus) +
    n(input.performance_bonus) +
    n(input.sales_bonus);
  const deductionAmount =
    n(input.labor_insurance_fee) +
    n(input.health_insurance_fee) +
    n(input.pension_self_pay) +
    leaveDeduction +
    n(input.advance_payment) +
    n(input.kip_penalty) +
    n(input.mistake_deduction);

  return {
    overtime_pay: overtimePay,
    sick_leave_deduction: leaveDeduction,
    gross_amount: grossAmount,
    deduction_amount: deductionAmount,
    net_salary: grossAmount - deductionAmount
  };
}

export function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export function saveStaffSession(staff: StaffInfo) {
  window.localStorage.setItem(
    staffSessionKey,
    JSON.stringify({
      employee_no: staff.employee_no,
      name: staff.name,
      shop_id: staff.shop_id,
      position: staff.position,
      login_at: new Date().toISOString()
    })
  );
}

export function getStaffSession(): Pick<StaffInfo, "employee_no" | "name" | "shop_id" | "position"> | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(staffSessionKey) || "null");
  } catch {
    return null;
  }
}

export function clearStaffSession() {
  window.localStorage.removeItem(staffSessionKey);
}

export async function staffLogin(employeeNo: string, password: string) {
  const { data, error } = await supabase
    .from("staff_info")
    .select("id, employee_no, password_hash, name, shop_id, position, phone, identity_info, hire_date, resigned")
    .eq("employee_no", employeeNo)
    .eq("resigned", false)
    .single();

  if (error || !data) throw new Error("找不到員工帳號，請確認員工編號。");

  const staff = data as StaffInfo;
  if (staff.password_hash !== password) throw new Error("員工密碼錯誤，請重新確認。");

  saveStaffSession(staff);
  return staff;
}

export async function loadStaffProfile(employeeNo: string) {
  return supabase.from("staff_info").select("*").eq("employee_no", employeeNo).single();
}

export async function loadStaffSalary(employeeNo: string) {
  return supabase
    .from("salary_records")
    .select("*")
    .eq("employee_no", employeeNo)
    .order("salary_month", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function loadStaffAttendance(employeeNo: string) {
  return supabase
    .from("staff_attendance")
    .select("id, employee_no, work_date, clock_in_at, clock_out_at, late_minutes, leave_type, leave_hours, overtime_hours")
    .eq("employee_no", employeeNo)
    .order("work_date", { ascending: false });
}

export async function loadStaffMistakes(employeeNo: string) {
  return supabase
    .from("staff_mistake_record")
    .select("id, appointment_id, appointment_no, employee_no, mistake_type, description, deduct_amount, occurred_at, is_settled, settled_salary_id, sync_status, last_sync_at, sync_error")
    .eq("employee_no", employeeNo)
    .order("occurred_at", { ascending: false });
}

export async function loadStaffModifyRequests(staffId: string) {
  return supabase
    .from("staff_info_modify_request")
    .select("id, staff_id, employee_no, field_name, new_value, request_note, requested_at, review_status, reviewer_id, review_note, reviewed_at")
    .eq("staff_id", staffId)
    .order("requested_at", { ascending: false });
}


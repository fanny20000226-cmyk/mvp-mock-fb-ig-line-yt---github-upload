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
  hire_date?: string | null;
  resigned: boolean;
};

export type StaffSalary = {
  id: string;
  employee_no: string;
  salary_month: string;
  base_salary: number;
  construction_bonus: number;
  overtime_pay: number;
  late_deduction: number;
  leave_deduction: number;
  photo_penalty: number;
  other_deduction: number;
  net_salary: number;
  created_at: string;
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

export type WorkPhotoReminder = {
  id: string;
  employee_no: string;
  construction_order_id: string | null;
  due_at: string;
  remind_sent_at: string | null;
  photo_completed: boolean;
  penalty_applied: boolean;
  penalty_amount: number;
};

const staffSessionKey = "peiway-staff-session";

export function calcNetSalary(input: {
  base_salary: number;
  construction_bonus: number;
  overtime_pay: number;
  late_deduction: number;
  leave_deduction: number;
  photo_penalty: number;
  other_deduction: number;
}) {
  return (
    Number(input.base_salary || 0) +
    Number(input.construction_bonus || 0) +
    Number(input.overtime_pay || 0) -
    Number(input.late_deduction || 0) -
    Number(input.leave_deduction || 0) -
    Number(input.photo_penalty || 0) -
    Number(input.other_deduction || 0)
  );
}

export function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export function saveStaffSession(staff: StaffInfo) {
  const session = {
    employee_no: staff.employee_no,
    name: staff.name,
    shop_id: staff.shop_id,
    position: staff.position,
    login_at: new Date().toISOString()
  };
  window.localStorage.setItem(staffSessionKey, JSON.stringify(session));
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
  if (staff.password_hash !== password) throw new Error("員工密碼不正確。");
  saveStaffSession(staff);
  return staff;
}

export async function loadStaffProfile(employeeNo: string) {
  return supabase
    .from("staff_info")
    .select("id, employee_no, name, shop_id, position, phone, identity_info, hire_date, resigned")
    .eq("employee_no", employeeNo)
    .single();
}

export async function loadStaffSalary(employeeNo: string) {
  return supabase
    .from("staff_salary")
    .select("id, employee_no, salary_month, base_salary, construction_bonus, overtime_pay, late_deduction, leave_deduction, photo_penalty, other_deduction, net_salary, created_at")
    .eq("employee_no", employeeNo)
    .order("salary_month", { ascending: false });
}

export async function loadStaffAttendance(employeeNo: string) {
  return supabase
    .from("staff_attendance")
    .select("id, employee_no, work_date, clock_in_at, clock_out_at, late_minutes, leave_type, leave_hours, overtime_hours")
    .eq("employee_no", employeeNo)
    .order("work_date", { ascending: false });
}

export async function loadStaffPhotoReminders(employeeNo: string) {
  return supabase
    .from("work_photo_remind")
    .select("id, employee_no, construction_order_id, due_at, remind_sent_at, photo_completed, penalty_applied, penalty_amount")
    .eq("employee_no", employeeNo)
    .order("due_at", { ascending: false });
}

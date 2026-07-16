import { supabase } from "./supabase";

export async function listCars() {
  return supabase
    .from("cars")
    .select("id, customer_name, customer_phone, plate_no, brand, model, year, color, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listQuotations() {
  return supabase
    .from("quotations")
    .select("id, quote_no, customer_name, customer_phone, plate_no, total_amount, final_amount, status, created_at")
    .order("created_at", { ascending: false });
}

export async function listConstructionOrders() {
  return supabase
    .from("construction_orders")
    .select("id, order_no, status, start_at, finish_at, total_amount, paid_amount, cars(customer_name, plate_no)")
    .order("created_at", { ascending: false });
}

export async function listServiceItems() {
  return supabase
    .from("service_items")
    .select("id, name, category, base_price, description, active, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listPayments() {
  return supabase
    .from("payment")
    .select("id, payment_no, pay_type, amount, paid_at, check_status, remark")
    .order("paid_at", { ascending: false });
}

export async function listEmployees() {
  return supabase
    .from("employees")
    .select("id, employee_no, name, phone, department, position, active, updated_at")
    .order("updated_at", { ascending: false });
}

export async function listAttendance() {
  return supabase
    .from("attendance")
    .select("id, work_date, clock_in_at, clock_out_at, is_late, is_early_leave, employees(name)")
    .order("work_date", { ascending: false });
}

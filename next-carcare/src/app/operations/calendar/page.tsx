"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import type { Role, UserProfile } from "@/lib/permissions";
import { supabase } from "@/lib/supabase";
import SyncStatusBadge, { type SyncState } from "@/components/SyncStatusBadge";
import { useUiFeedback } from "@/components/UiFeedback";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

type AppointmentStatus = "待確認" | "已到店" | "已取消" | "已完成";
type ScheduleType = "evaluation" | "construction" | "reminder";

type StaffOption = {
  employee_no: string;
  name: string;
  position: string;
  shop_id: string | null;
};

type CustomerOption = {
  id: string;
  name: string | null;
  phone: string | null;
  customer_tags?: string[] | null;
  store_id?: string | null;
};

type AppointmentRow = {
  id: string;
  appointment_no: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  license_plate: string | null;
  car_brand: string | null;
  car_model: string | null;
  appoint_date: string;
  appoint_time: string;
  service_content: string;
  status: AppointmentStatus;
  remark: string | null;
  shop_id: string | null;
  store_id: string | null;
  forced_conflict: boolean | null;
  conflict_note: string | null;
  created_at: string;
  sync_status?: SyncState | null; last_sync_at?: string | null; sync_error?: string | null;
  assign_staff_ids: string[];
  schedule_type: ScheduleType;
};

type AppointmentForm = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  license_plate: string;
  car_brand: string;
  car_model: string;
  appoint_date: string;
  appoint_time: string;
  service_content: string;
  status: AppointmentStatus;
  remark: string;
  assign_staff_ids: string[];
  schedule_type: ScheduleType;
};

const statuses: AppointmentStatus[] = ["待確認", "已到店", "已取消", "已完成"];
const scheduleTypes: Array<{ value: ScheduleType; label: string; badge: string }> = [
  { value: "evaluation", label: "預約評估", badge: "border-carcare-yellow bg-carcare-yellow/15 text-neutral-900" },
  { value: "construction", label: "施作施工", badge: "border-blue-500 bg-blue-50 text-blue-800" },
  { value: "reminder", label: "特別提醒", badge: "border-red-500 bg-red-50 text-red-700" }
];
const slotCapacity = 3;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newAppointmentNo() {
  return `A${Date.now()}`;
}

function emptyForm(): AppointmentForm {
  return {
    id: "",
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    license_plate: "",
    car_brand: "",
    car_model: "",
    appoint_date: today(),
    appoint_time: "10:00",
    service_content: "",
    status: "待確認",
    remark: "",
    assign_staff_ids: [],
    schedule_type: "evaluation"
  };
}

function canWriteAppointment(role?: Role | null) {
  return role === "admin" || role === "shop_manager" || role === "vice_manager";
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function monthDays(month: string) {
  const [year, rawMonth] = month.split("-").map(Number);
  const count = new Date(year, rawMonth, 0).getDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function tagList(value?: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export default function CalendarPage() {
  const { confirm } = useUiFeedback();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [staffRows, setStaffRows] = useState<StaffOption[]>([]);
  const [form, setForm] = useState<AppointmentForm>(emptyForm());
  const [view, setView] = useState<"month" | "day">("month");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [filterDate, setFilterDate] = useState(today());
  const [filterStatus, setFilterStatus] = useState<"" | AppointmentStatus>("");
  const [keyword, setKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [activeScheduleType, setActiveScheduleType] = useState<ScheduleType>("evaluation");
  const [mistakeRow, setMistakeRow] = useState<AppointmentRow | null>(null);
  const [mistakeSaving, setMistakeSaving] = useState(false);
  const [mistakeForm, setMistakeForm] = useState({ employee_no: "", mistake_type: "施工缺失", description: "", deduct_amount: "0" });
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const canWrite = canWriteAppointment(profile?.role);
  const appointmentFormOpen = mobileFormOpen || Boolean(form.id);

  async function load() {
    const currentProfile = await getCurrentProfile();
    setProfile(currentProfile);

    const appointmentResult = await supabase
      .from("appointments")
      .select(
        "id, appointment_no, customer_id, customer_name, customer_phone, license_plate, car_brand, car_model, appoint_date, appoint_time, service_content, status, remark, shop_id, store_id, forced_conflict, conflict_note, created_at, sync_status, last_sync_at, sync_error, assign_staff_ids, schedule_type"
      )
      .order("appoint_date", { ascending: true })
      .order("appoint_time", { ascending: true });

    if (appointmentResult.error) {
      alert(`讀取預約失敗：${appointmentResult.error.message}\n請先執行 supabase-step17-appointments-tags-sync.sql`);
    } else {
      setRows((appointmentResult.data || []) as AppointmentRow[]);
    }

    const customerResult = await supabase
      .from("customers")
      .select("id, name, phone, customer_tags, store_id")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (!customerResult.error) {
      setCustomers((customerResult.data || []) as CustomerOption[]);
    } else {
      const fallback = await supabase
        .from("customers")
        .select("id, name, phone, store_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!fallback.error) setCustomers((fallback.data || []) as CustomerOption[]);
    }

    const staffResult = await supabase
      .from("staff_info")
      .select("employee_no, name, position, shop_id")
      .eq("resigned", false)
      .order("employee_no", { ascending: true });
    if (!staffResult.error) {
      const all = (staffResult.data || []) as StaffOption[];
      setStaffRows(currentProfile?.role === "admin" || !currentProfile?.shop_id ? all : all.filter((staff) => staff.shop_id === currentProfile.shop_id));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const customerById = useMemo(() => {
    const map = new Map<string, CustomerOption>();
    customers.forEach((customer) => map.set(customer.id, customer));
    return map;
  }, [customers]);

  const filteredRows = useMemo(() => {
    const term = normalize(keyword);
    return rows.filter((row) => {
      if (filterStatus && row.status !== filterStatus) return false;
      if (view === "day" && row.appoint_date !== filterDate) return false;
      if (view === "month" && !row.appoint_date.startsWith(month)) return false;
      if (!term) return true;
      return normalize(
        `${row.appointment_no} ${row.customer_name} ${row.customer_phone} ${row.license_plate} ${row.car_brand} ${row.car_model} ${row.service_content}`
      ).includes(term);
    });
  }, [filterDate, filterStatus, keyword, month, rows, view]);

  const rowsByDay = useMemo(() => {
    const grouped = new Map<string, AppointmentRow[]>();
    filteredRows.forEach((row) => grouped.set(row.appoint_date, [...(grouped.get(row.appoint_date) || []), row]));
    return grouped;
  }, [filteredRows]);

  function selectCustomer(customerId: string) {
    const customer = customerById.get(customerId);
    setForm((current) => ({
      ...current,
      customer_id: customerId,
      customer_name: customer?.name || current.customer_name,
      customer_phone: customer?.phone || current.customer_phone
    }));
  }

  function editRow(row: AppointmentRow) {
    setMobileFormOpen(true);
    setForm({
      id: row.id,
      customer_id: row.customer_id || "",
      customer_name: row.customer_name || "",
      customer_phone: row.customer_phone || "",
      license_plate: row.license_plate || "",
      car_brand: row.car_brand || "",
      car_model: row.car_model || "",
      appoint_date: row.appoint_date,
      appoint_time: row.appoint_time,
      service_content: row.service_content || "",
      status: row.status,
      remark: row.remark || "",
      assign_staff_ids: row.assign_staff_ids || [],
      schedule_type: row.schedule_type || "evaluation"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function syncAppointment(record: AppointmentRow | Record<string, unknown>, operation: "insert" | "update") {
    authenticatedFetch("/api/appointments/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation,
        unique_key: String(record.appointment_no || record.id || ""),
        store_id: String(record.shop_id || record.store_id || profile?.shop_id || ""),
        plate: String(record.license_plate || ""),
        model: String(record.car_model || ""),
        record: {
          ...record,
          updated_at: new Date().toISOString()
        }
      })
    }).catch(() => {
      // N8N/Google Sheets sync is best-effort and must not block appointment saves.
    });
  }

  async function ensureCustomerId() {
    if (form.customer_id) return form.customer_id;
    if (!form.customer_name.trim() && !form.customer_phone.trim()) return null;

    const payload = {
      name: form.customer_name.trim() || "未命名客戶",
      phone: form.customer_phone.trim(),
      store_id: profile?.shop_id || null,
      customer_tags: [] as string[],
      updated_at: new Date().toISOString()
    };

    const inserted = await supabase.from("customers").insert(payload).select("id").single();
    if (!inserted.error && inserted.data?.id) return inserted.data.id as string;

    const fallback = await supabase
      .from("customers")
      .insert({ name: payload.name, phone: payload.phone, store_id: payload.store_id })
      .select("id")
      .single();
    if (fallback.error) throw fallback.error;
    return fallback.data.id as string;
  }

  async function validateConflict() {
    const activeRows = rows.filter((row) => row.status !== "已取消" && row.id !== form.id);
    const sameCar = activeRows.find(
      (row) =>
        normalize(row.license_plate) &&
        normalize(row.license_plate) === normalize(form.license_plate) &&
        row.appoint_date === form.appoint_date &&
        row.appoint_time === form.appoint_time
    );
    if (sameCar) {
      alert(`同一台車同一時段已有預約：${sameCar.customer_name || "-"} / ${sameCar.appointment_no}`);
      return { ok: false, forced: false, note: "" };
    }

    const sameSlot = activeRows.filter(
      (row) =>
        row.appoint_date === form.appoint_date &&
        row.appoint_time === form.appoint_time &&
        (!profile?.shop_id || row.shop_id === profile.shop_id || row.store_id === profile.shop_id)
    );

    if (sameSlot.length >= slotCapacity) {
      const detail = sameSlot
        .map((row) => `${row.appoint_time} ${row.customer_name || "-"} ${row.license_plate || "-"} ${row.service_content}`)
        .join("\n");
      if (!canWrite) {
        alert(`此時段已超過可承載數量，請調整時間。\n${detail}`);
        return { ok: false, forced: false, note: "" };
      }
      const ok = await confirm({ title: "預約時段衝突", message: `此時段已有 ${sameSlot.length} 筆預約，是否強制建立？\n${detail}`, confirmLabel: "強制建立", tone: "warning" });
      if (!ok) return { ok: false, forced: false, note: "" };
      return { ok: true, forced: true, note: `強制建立：同時段已有 ${sameSlot.length} 筆預約\n${detail}` };
    }

    return { ok: true, forced: false, note: "" };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return alert("目前角色僅可檢視預約，不能新增或修改。");
    if (!form.customer_name.trim() || !form.license_plate.trim() || !form.service_content.trim()) {
      return alert("請填寫客戶姓名、車牌與服務項目。");
    }

    setSaving(true);
    try {
      const conflict = await validateConflict();
      if (!conflict.ok) return;
      const customerId = await ensureCustomerId();
      const payload = {
        customer_id: customerId,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        license_plate: form.license_plate.trim(),
        car_brand: form.car_brand.trim(),
        car_model: form.car_model.trim(),
        appoint_date: form.appoint_date,
        appoint_time: form.appoint_time,
        service_content: form.service_content.trim(),
        status: form.status,
        remark: form.remark.trim(),
        shop_id: profile?.shop_id || null,
        store_id: profile?.shop_id || null,
        forced_conflict: conflict.forced,
        conflict_note: conflict.note || null,
        created_by: profile?.id || null,
        assign_staff_ids: form.assign_staff_ids,
        schedule_type: form.schedule_type
      };

      if (form.id) {
        const { data, error } = await supabase
          .from("appointments")
          .update(payload)
          .eq("id", form.id)
          .select()
          .single();
        if (error) throw error;
        syncAppointment(data as AppointmentRow, "update");
      } else {
        const { data, error } = await supabase
          .from("appointments")
          .insert({ ...payload, appointment_no: newAppointmentNo() })
          .select()
          .single();
        if (error) throw error;
        syncAppointment(data as AppointmentRow, "insert");
      }

      setForm(emptyForm());
      setMobileFormOpen(false);
      await load();
      alert("預約已儲存，並已送出 N8N/Google Sheets 同步事件。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "預約儲存失敗。");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(row: AppointmentRow, status: AppointmentStatus) {
    if (!canWrite) return alert("目前角色僅可檢視預約，不能修改狀態。");
    const { data, error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", row.id)
      .select()
      .single();
    if (error) return alert(error.message);
    syncAppointment(data as AppointmentRow, "update");
    load();
  }

  async function deleteRow(row: AppointmentRow) {
    if (!canWrite) return alert("目前角色僅可檢視預約，不能刪除。");
    const ok = await confirm({ title: "刪除預約", message: `確定刪除預約 ${row.appointment_no}？`, confirmLabel: "確認刪除", tone: "warning" });
    if (!ok) return;
    const { error } = await supabase.from("appointments").delete().eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  function staffName(employeeNo: string) {
    const staff = staffRows.find((item) => item.employee_no === employeeNo);
    return staff ? `${staff.name} / ${staff.employee_no}` : employeeNo;
  }

  async function updateAssignedStaff(row: AppointmentRow, employeeNo: string, checked: boolean) {
    if (!canWrite) return;
    const nextIds = checked
      ? Array.from(new Set([...(row.assign_staff_ids || []), employeeNo]))
      : (row.assign_staff_ids || []).filter((id) => id !== employeeNo);
    const { data, error } = await supabase.from("appointments").update({ assign_staff_ids: nextIds }).eq("id", row.id).select().single();
    if (error) return alert(error.message);
    syncAppointment(data as AppointmentRow, "update");
    await load();
  }

  function openMistake(row: AppointmentRow) {
    const employeeNo = row.assign_staff_ids?.[0] || "";
    setMistakeForm({ employee_no: employeeNo, mistake_type: "施工缺失", description: "", deduct_amount: "0" });
    setMistakeRow(row);
  }

  async function submitMistake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mistakeRow || !mistakeForm.employee_no || !mistakeForm.description.trim()) {
      return alert("請選擇員工並填寫缺失說明。");
    }
    setMistakeSaving(true);
    try {
      const response = await authenticatedFetch("/api/appointments/mistakes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appointment_id: mistakeRow.id,
          employee_no: mistakeForm.employee_no,
          mistake_type: mistakeForm.mistake_type,
          description: mistakeForm.description.trim(),
          deduct_amount: Number(mistakeForm.deduct_amount || 0)
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "缺失紀錄建立失敗。");
      setMistakeRow(null);
      alert(payload.sync_ok === false ? "缺失紀錄已保存；雲端同步暫時待重試。" : "缺失紀錄已保存並送出雲端同步事件。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "缺失紀錄建立失敗。");
    } finally {
      setMistakeSaving(false);
    }
  }

  return (
    <RequireAuth>
      <div className="space-y-5">
        <section className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">預約管理</p>
              <h1 className="text-2xl font-black">預約行事曆</h1>
              <p className="mt-1 text-sm text-neutral-500">
                建立、查詢與管理門市預約；員工帳號進入時僅能檢視。
              </p>
            </div>
            <span className="rounded-full bg-carcare-yellow px-4 py-2 text-sm font-black text-carcare-black">
              {canWrite ? "管理模式" : "員工唯讀"}
            </span>
          </div>
        </section>

        {canWrite ? (
          <form onSubmit={submit} className="card">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-carcare-yellow">{form.id ? "編輯預約" : "新增預約"}</p>
                <h2 className="text-xl font-black">客戶與車輛預約資料</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="secondary-btn md:hidden"
                  aria-expanded={appointmentFormOpen}
                  aria-controls="appointment-create-fields"
                  onClick={() => setMobileFormOpen((open) => !open)}
                >
                  {appointmentFormOpen ? "收合新增預約" : "展開新增預約"}
                </button>
                {form.id ? (
                  <button type="button" className="secondary-btn" onClick={() => { setForm(emptyForm()); setMobileFormOpen(false); }}>
                    取消編輯
                  </button>
                ) : null}
              </div>
            </div>

            <div id="appointment-create-fields" className={`${appointmentFormOpen ? "block" : "hidden"} md:block`}>
              <div className="grid gap-3 lg:grid-cols-4">
                <select className="form-input" value={form.customer_id} onChange={(event) => selectCustomer(event.target.value)}>
                <option value="">新客戶 / 手動填寫</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || "未命名"} / {customer.phone || "未填電話"}
                  </option>
                ))}
                </select>
                <input className="form-input" placeholder="客戶姓名" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
              <input className="form-input" placeholder="聯絡電話" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} />
              <input className="form-input" placeholder="車牌" value={form.license_plate} onChange={(event) => setForm({ ...form, license_plate: event.target.value })} />
              <input className="form-input" placeholder="車廠品牌" value={form.car_brand} onChange={(event) => setForm({ ...form, car_brand: event.target.value })} />
              <input className="form-input" placeholder="車型" value={form.car_model} onChange={(event) => setForm({ ...form, car_model: event.target.value })} />
              <input className="form-input" type="date" value={form.appoint_date} onChange={(event) => setForm({ ...form, appoint_date: event.target.value })} />
              <input className="form-input" type="time" value={form.appoint_time} onChange={(event) => setForm({ ...form, appoint_time: event.target.value })} />
              <select className="form-input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select className="form-input" value={form.schedule_type} onChange={(event) => setForm({ ...form, schedule_type: event.target.value as ScheduleType })}>
                {scheduleTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <input className="form-input lg:col-span-2" placeholder="預約評估 / 施工項目" value={form.service_content} onChange={(event) => setForm({ ...form, service_content: event.target.value })} />
              <fieldset className="rounded-xl border border-neutral-200 p-3 lg:col-span-4">
                <legend className="px-2 text-sm font-black">指派施工人員（可複選）</legend>
                <div className="flex flex-wrap gap-2">
                  {staffRows.map((staff) => {
                    const selected = form.assign_staff_ids.includes(staff.employee_no);
                    return (
                      <label key={staff.employee_no} className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-bold transition duration-200 ${selected ? "border-carcare-yellow bg-carcare-yellow" : "border-neutral-200 bg-white"}`}>
                        <input className="mr-2" type="checkbox" checked={selected} onChange={(event) => setForm({ ...form, assign_staff_ids: event.target.checked ? [...form.assign_staff_ids, staff.employee_no] : form.assign_staff_ids.filter((id) => id !== staff.employee_no) })} />
                        {staff.name} / {staff.employee_no}
                      </label>
                    );
                  })}
                  {!staffRows.length ? <span className="text-sm text-neutral-500">目前沒有可指派員工。</span> : null}
                </div>
              </fieldset>
                <textarea className="form-input lg:col-span-4" placeholder="備註" value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} />
              </div>
              <button className="primary-btn mt-4" disabled={saving} type="submit">
                {saving ? "儲存中..." : form.id ? "更新預約並同步雲端" : "建立預約並同步雲端"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="card">
          <div className="grid gap-3 lg:grid-cols-5">
            <select className="form-input" value={view} onChange={(event) => setView(event.target.value as "month" | "day")}>
              <option value="month">月曆檢視</option>
              <option value="day">日曆檢視</option>
            </select>
            <input className="form-input" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <input className="form-input" type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} />
            <select className="form-input" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as "" | AppointmentStatus)}>
              <option value="">全部狀態</option>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
            <input className="form-input" placeholder="搜尋姓名、電話、車牌、項目" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
        </section>

        {view === "month" ? (
          <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {monthDays(month).map((day) => {
              const dayRows = rowsByDay.get(day) || [];
              return (
                <div key={day} className="card min-h-32">
                  <button type="button" className="w-full text-left" onClick={() => { setSelectedDay(day); setActiveScheduleType("evaluation"); }}>
                    <p className="font-black">{day.slice(5)}</p>
                    <p className="mt-1 text-xs text-neutral-500">排程 {dayRows.length} 筆，點擊查看當日詳情</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {scheduleTypes.map((type) => {
                        const count = dayRows.filter((row) => (row.schedule_type || "evaluation") === type.value).length;
                        return count ? <span key={type.value} className={`rounded-full border px-2 py-1 text-[11px] font-black ${type.badge}`}>{type.label} {count}</span> : null;
                      })}
                    </div>
                  </button>
                  <div className="mt-3 space-y-2">
                    {dayRows.slice(0, 4).map((row) => (
                      <button
                        type="button"
                        key={row.id}
                        onClick={() => { setSelectedDay(row.appoint_date); setActiveScheduleType(row.schedule_type || "evaluation"); }}
                        className={`w-full rounded-xl border p-2 text-left text-xs transition duration-200 hover:border-carcare-yellow ${
                          row.forced_conflict ? "border-carcare-yellow bg-carcare-yellow/10" : "border-neutral-200 bg-white"
                        }`}
                        title={row.conflict_note || undefined}
                      >
                        <span className="font-black">{row.appoint_time}</span> {row.customer_name || "-"}
                        <br />
                        {row.license_plate || "-"} / {row.status}
                      </button>
                    ))}
                    {dayRows.length > 4 ? <p className="text-xs text-neutral-500">另有 {dayRows.length - 4} 筆</p> : null}
                  </div>
                </div>
              );
            })}
          </section>
        ) : null}

        <section className="card">
          <h2 className="mb-4 text-xl font-black">預約清單</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>預約單號</th>
                  <th>日期時間</th>
                  <th>客戶 / 車牌</th>
                  <th>車型</th>
                  <th>服務項目</th>
                  <th>分類 / 指派人員</th>
                  <th>狀態</th>
                  <th>標籤</th>
                  <th>同步狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const customerTags = tagList(customerById.get(row.customer_id || "")?.customer_tags);
                  return (
                    <tr key={row.id} className={row.forced_conflict ? "bg-carcare-yellow/10" : undefined}>
                      <td>{row.appointment_no}</td>
                      <td>{row.appoint_date} {row.appoint_time}</td>
                      <td>{row.customer_name || "-"} / {row.license_plate || "-"}</td>
                      <td>{[row.car_brand, row.car_model].filter(Boolean).join(" ") || "-"}</td>
                      <td>{row.service_content}</td>
                      <td>
                        <div className="min-w-40 space-y-1">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${scheduleTypes.find((item) => item.value === (row.schedule_type || "evaluation"))?.badge}`}>{scheduleTypes.find((item) => item.value === (row.schedule_type || "evaluation"))?.label}</span>
                          <p className="text-xs text-neutral-600">{row.assign_staff_ids?.length ? row.assign_staff_ids.map(staffName).join("、") : "尚未指派"}</p>
                        </div>
                      </td>
                      <td>{row.status}</td>
                      <td>
                        <div className="flex min-w-28 flex-wrap gap-1">
                          {customerTags.map((tag) => (
                            <span key={tag} className="rounded-full bg-carcare-yellow px-2 py-1 text-xs font-black text-carcare-black">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><SyncStatusBadge table="appointments" row={row as AppointmentRow & Record<string, unknown>} syncType="appointment" isAdmin={profile?.role === "admin"} onChanged={load} /></td>
                      <td>
                        <div className="flex min-w-72 flex-wrap gap-2">
                          {canWrite ? (
                            <>
                              <button type="button" className="secondary-btn" onClick={() => editRow(row)}>編輯</button>
                              <button type="button" className="secondary-btn" onClick={() => updateStatus(row, "已到店")}>已到店</button>
                              <button type="button" className="secondary-btn" onClick={() => updateStatus(row, "已完成")}>完成</button>
                              <button type="button" className="secondary-btn" onClick={() => updateStatus(row, "已取消")}>取消</button>
                              <button type="button" className="secondary-btn text-red-600" onClick={() => deleteRow(row)}>刪除</button>
                            </>
                          ) : (
                            <span className="text-sm text-neutral-500">僅檢視</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredRows.length ? (
                  <tr>
                    <td colSpan={10} className="text-center text-neutral-500">目前沒有符合條件的預約。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {selectedDay ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="dialog" aria-modal="true" aria-label={`${selectedDay} 當日排程`}>
            <section className="h-full w-full overflow-y-auto bg-carcare-bg p-4 shadow-2xl md:max-w-xl md:p-6">
              <div className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-xl bg-carcare-black p-4 text-white">
                <div>
                  <p className="text-xs font-bold text-carcare-yellow">當日排程</p>
                  <h2 className="text-xl font-black">{selectedDay}</h2>
                </div>
                <button type="button" className="rounded-lg bg-white px-3 py-2 font-black text-carcare-black" onClick={() => setSelectedDay(null)}>關閉</button>
              </div>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {scheduleTypes.map((type) => (
                  <button type="button" key={type.value} onClick={() => setActiveScheduleType(type.value)} className={`rounded-xl border px-2 py-3 text-sm font-black transition duration-200 ${activeScheduleType === type.value ? type.badge : "border-neutral-200 bg-white text-neutral-500"}`}>
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {(rowsByDay.get(selectedDay) || []).filter((row) => (row.schedule_type || "evaluation") === activeScheduleType).map((row) => (
                  <article key={row.id} className="card space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-black">{row.appoint_time} · {row.customer_name || "未填客戶"}</p>
                        <p className="text-sm text-neutral-600">{row.license_plate || "未填車牌"} / {[row.car_brand, row.car_model].filter(Boolean).join(" ") || "未填車型"}</p>
                      </div>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{row.status}</span>
                    </div>
                    <p className="rounded-xl bg-neutral-50 p-3 text-sm"><strong>服務項目：</strong>{row.service_content}</p>
                    <div>
                      <p className="mb-2 text-sm font-black">指派施工人員</p>
                      <div className="flex flex-wrap gap-2">
                        {staffRows.map((staff) => {
                          const checked = (row.assign_staff_ids || []).includes(staff.employee_no);
                          return (
                            <label key={staff.employee_no} className={`rounded-xl border px-3 py-2 text-xs font-bold ${checked ? "border-carcare-yellow bg-carcare-yellow" : "border-neutral-200 bg-white"}`}>
                              <input className="mr-2" type="checkbox" checked={checked} disabled={!canWrite} onChange={(event) => updateAssignedStaff(row, staff.employee_no, event.target.checked)} />
                              {staff.name}
                            </label>
                          );
                        })}
                        {!staffRows.length ? <span className="text-sm text-neutral-500">尚無員工資料。</span> : null}
                      </div>
                    </div>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="primary-btn" onClick={() => openMistake(row)}>登記缺失 / 異常</button>
                        <button type="button" className="secondary-btn" onClick={() => { editRow(row); setSelectedDay(null); }}>編輯排程</button>
                      </div>
                    ) : null}
                  </article>
                ))}
                {!(rowsByDay.get(selectedDay) || []).some((row) => (row.schedule_type || "evaluation") === activeScheduleType) ? (
                  <div className="card text-center text-neutral-500">此分類目前沒有排程。</div>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}

        {mistakeRow ? (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="登記缺失異常">
            <form onSubmit={submitMistake} className="card w-full max-w-lg space-y-4">
              <div>
                <p className="text-sm font-black text-carcare-yellow">員工缺失紀錄</p>
                <h2 className="text-xl font-black">{mistakeRow.appointment_no} / {mistakeRow.customer_name || "-"}</h2>
              </div>
              <label className="block text-sm font-black">責任員工
                <select className="form-input mt-2" required value={mistakeForm.employee_no} onChange={(event) => setMistakeForm({ ...mistakeForm, employee_no: event.target.value })}>
                  <option value="">選擇員工</option>
                  {staffRows.filter((staff) => !mistakeRow.assign_staff_ids?.length || mistakeRow.assign_staff_ids.includes(staff.employee_no)).map((staff) => <option key={staff.employee_no} value={staff.employee_no}>{staff.name} / {staff.employee_no}</option>)}
                </select>
              </label>
              <label className="block text-sm font-black">缺失類型
                <select className="form-input mt-2" value={mistakeForm.mistake_type} onChange={(event) => setMistakeForm({ ...mistakeForm, mistake_type: event.target.value })}>
                  <option>施工缺失</option><option>流程異常</option><option>服務品質</option><option>其他</option>
                </select>
              </label>
              <label className="block text-sm font-black">問題說明
                <textarea className="form-input mt-2 min-h-28" required value={mistakeForm.description} onChange={(event) => setMistakeForm({ ...mistakeForm, description: event.target.value })} />
              </label>
              <label className="block text-sm font-black">本次扣款金額
                <input className="form-input mt-2" type="number" min="0" inputMode="decimal" value={mistakeForm.deduct_amount} onChange={(event) => setMistakeForm({ ...mistakeForm, deduct_amount: event.target.value })} />
              </label>
              <p className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600">儲存後會寫入員工個人紀錄、人資總覽與 Monitor 日誌，並送出 N8N 事件。主系統不包含任何 LINE 發送程式。</p>
              <div className="flex gap-2">
                <button className="primary-btn flex-1" disabled={mistakeSaving} type="submit">{mistakeSaving ? "儲存中..." : "確認登記"}</button>
                <button className="secondary-btn" type="button" onClick={() => setMistakeRow(null)}>取消</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}

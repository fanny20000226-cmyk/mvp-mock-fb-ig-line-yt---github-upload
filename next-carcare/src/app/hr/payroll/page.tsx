"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import SalaryPdfButton from "@/components/SalaryPdfButton";
import { getCurrentProfile } from "@/lib/auth";
import { calcNetSalary, money, type StaffInfo, type StaffSalary } from "@/lib/staff";
import { supabase } from "@/lib/supabase";

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
type ReminderRow = {
  id: string;
  employee_no: string;
  construction_order_id: string | null;
  due_at: string;
  photo_completed: boolean;
  penalty_applied: boolean;
  penalty_amount: number;
};

const positionOptions = ["admin", "shop_manager", "frontdesk", "technician", "worker"];

export default function PayrollPage() {
  const [profileRole, setProfileRole] = useState("");
  const [profileShopId, setProfileShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffInfo[]>([]);
  const [salaryRows, setSalaryRows] = useState<StaffSalary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [staffForm, setStaffForm] = useState({
    employee_no: "",
    password_hash: "",
    name: "",
    shop_id: "",
    position: "technician",
    phone: "",
    identity_info: "",
    hire_date: ""
  });
  const [salaryForm, setSalaryForm] = useState({
    employee_no: "",
    salary_month: new Date().toISOString().slice(0, 7),
    base_salary: "0",
    construction_bonus: "0",
    overtime_pay: "0",
    late_deduction: "0",
    leave_deduction: "0",
    photo_penalty: "0",
    other_deduction: "0"
  });
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
  const [reminderForm, setReminderForm] = useState({
    employee_no: "",
    construction_order_id: "",
    due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    penalty_amount: "300"
  });

  const isHrAdmin = ["admin", "hr"].includes(profileRole);
  const canViewShop = ["shop_manager", "vice_manager"].includes(profileRole);

  const salaryNet = useMemo(
    () =>
      calcNetSalary({
        base_salary: Number(salaryForm.base_salary || 0),
        construction_bonus: Number(salaryForm.construction_bonus || 0),
        overtime_pay: Number(salaryForm.overtime_pay || 0),
        late_deduction: Number(salaryForm.late_deduction || 0),
        leave_deduction: Number(salaryForm.leave_deduction || 0),
        photo_penalty: Number(salaryForm.photo_penalty || 0),
        other_deduction: Number(salaryForm.other_deduction || 0)
      }),
    [salaryForm]
  );

  async function load() {
    const profile = await getCurrentProfile();
    setProfileRole(profile?.role || "");
    setProfileShopId(profile?.shop_id || null);

    const [shopResult, staffResult, salaryResult, attendanceResult, reminderResult] = await Promise.all([
      supabase.from("shops").select("id, name").order("name"),
      supabase.from("staff_info").select("id, employee_no, name, shop_id, position, phone, identity_info, hire_date, resigned").order("created_at", { ascending: false }),
      supabase.from("staff_salary").select("id, employee_no, salary_month, base_salary, construction_bonus, overtime_pay, late_deduction, leave_deduction, photo_penalty, other_deduction, net_salary, created_at").order("salary_month", { ascending: false }),
      supabase.from("staff_attendance").select("id, employee_no, work_date, late_minutes, leave_type, leave_hours, overtime_hours").order("work_date", { ascending: false }).limit(60),
      supabase.from("work_photo_remind").select("id, employee_no, construction_order_id, due_at, photo_completed, penalty_applied, penalty_amount").order("due_at", { ascending: false }).limit(60)
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
    setReminders(((reminderResult.data || []) as ReminderRow[]).filter((row) => scopedNos.has(row.employee_no)));
  }

  useEffect(() => {
    load();
  }, []);

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin) return alert("只有總管理員或人資可以新增員工。");
    const { error } = await supabase.from("staff_info").insert({
      ...staffForm,
      shop_id: staffForm.shop_id || profileShopId,
      resigned: false
    });
    if (error) return alert(error.message);
    setStaffForm({ employee_no: "", password_hash: "", name: "", shop_id: "", position: "technician", phone: "", identity_info: "", hire_date: "" });
    await load();
  }

  async function saveSalary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin) return alert("只有總管理員或人資可以建立薪資單。");
    const { error } = await supabase.from("staff_salary").upsert(
      {
        employee_no: salaryForm.employee_no,
        salary_month: salaryForm.salary_month,
        base_salary: Number(salaryForm.base_salary || 0),
        construction_bonus: Number(salaryForm.construction_bonus || 0),
        overtime_pay: Number(salaryForm.overtime_pay || 0),
        late_deduction: Number(salaryForm.late_deduction || 0),
        leave_deduction: Number(salaryForm.leave_deduction || 0),
        photo_penalty: Number(salaryForm.photo_penalty || 0),
        other_deduction: Number(salaryForm.other_deduction || 0),
        net_salary: salaryNet
      },
      { onConflict: "employee_no,salary_month" }
    );
    if (error) return alert(error.message);
    await load();
  }

  async function createAttendance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin) return alert("只有總管理員或人資可以登記出勤。");
    const { error } = await supabase.from("staff_attendance").insert({
      employee_no: attendanceForm.employee_no,
      work_date: attendanceForm.work_date,
      clock_in_at: attendanceForm.clock_in_at || null,
      clock_out_at: attendanceForm.clock_out_at || null,
      late_minutes: Number(attendanceForm.late_minutes || 0),
      leave_type: attendanceForm.leave_type || null,
      leave_hours: Number(attendanceForm.leave_hours || 0),
      overtime_hours: Number(attendanceForm.overtime_hours || 0)
    });
    if (error) return alert(error.message);
    await load();
  }

  async function createReminder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHrAdmin && !canViewShop) return alert("沒有建立照片提醒權限。");
    const { error } = await supabase.from("work_photo_remind").insert({
      employee_no: reminderForm.employee_no,
      construction_order_id: reminderForm.construction_order_id || null,
      due_at: new Date(reminderForm.due_at).toISOString(),
      photo_completed: false,
      penalty_applied: false,
      penalty_amount: Number(reminderForm.penalty_amount || 0)
    });
    if (error) return alert(error.message);
    await load();
  }

  async function toggleReminder(row: ReminderRow, field: "photo_completed" | "penalty_applied") {
    const { error } = await supabase.from("work_photo_remind").update({ [field]: !row[field] }).eq("id", row.id);
    if (error) return alert(error.message);
    await load();
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <p className="text-sm font-black text-carcare-yellow">HR Payroll</p>
          <h1 className="text-2xl font-black">人資薪資績效管理</h1>
          <p className="mt-1 text-sm text-neutral-500">
            管理員建立員工帳號、薪資單、出勤紀錄與施工照片罰扣提醒；店長可查看自家門市狀態。
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card"><p className="text-sm text-neutral-500">員工數</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{staffRows.length}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">薪資單</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{salaryRows.length}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">出勤筆數</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{attendanceRows.length}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">待補照片</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{reminders.filter((row) => !row.photo_completed).length}</p></div>
        </section>

        {isHrAdmin ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={createStaff} className="card space-y-3">
              <h2 className="text-xl font-black">新增員工帳號</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <input className="form-input" placeholder="員工編號" value={staffForm.employee_no} onChange={(e) => setStaffForm({ ...staffForm, employee_no: e.target.value })} />
                <input className="form-input" type="password" placeholder="初始化密碼" value={staffForm.password_hash} onChange={(e) => setStaffForm({ ...staffForm, password_hash: e.target.value })} />
                <input className="form-input" placeholder="姓名" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                <input className="form-input" placeholder="聯絡電話" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                <select className="form-input" value={staffForm.shop_id} onChange={(e) => setStaffForm({ ...staffForm, shop_id: e.target.value })}>
                  <option value="">使用目前門市</option>
                  {shops.map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
                </select>
                <select className="form-input" value={staffForm.position} onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}>
                  {positionOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <input className="form-input" type="date" value={staffForm.hire_date} onChange={(e) => setStaffForm({ ...staffForm, hire_date: e.target.value })} />
                <input className="form-input" placeholder="身分資料備註" value={staffForm.identity_info} onChange={(e) => setStaffForm({ ...staffForm, identity_info: e.target.value })} />
              </div>
              <button className="primary-btn" type="submit">建立員工</button>
            </form>

            <form onSubmit={saveSalary} className="card space-y-3">
              <h2 className="text-xl font-black">建立 / 更新薪資單</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <select className="form-input" value={salaryForm.employee_no} onChange={(e) => setSalaryForm({ ...salaryForm, employee_no: e.target.value })}>
                  <option value="">選擇員工</option>
                  {staffRows.map((staff) => <option key={staff.employee_no} value={staff.employee_no}>{staff.name} / {staff.employee_no}</option>)}
                </select>
                <input className="form-input" type="month" value={salaryForm.salary_month} onChange={(e) => setSalaryForm({ ...salaryForm, salary_month: e.target.value })} />
                {(["base_salary", "construction_bonus", "overtime_pay", "late_deduction", "leave_deduction", "photo_penalty", "other_deduction"] as const).map((field) => (
                  <input key={field} className="form-input" type="number" placeholder={field} value={salaryForm[field]} onChange={(e) => setSalaryForm({ ...salaryForm, [field]: e.target.value })} />
                ))}
              </div>
              <div className="rounded-2xl bg-carcare-black p-4 text-white">
                <p className="text-sm text-white/70">本月實發薪資</p>
                <p className="text-3xl font-black text-carcare-yellow">{money(salaryNet)}</p>
              </div>
              <button className="primary-btn" type="submit">儲存薪資單</button>
            </form>
          </section>
        ) : null}

        {isHrAdmin ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <form onSubmit={createAttendance} className="card space-y-3">
              <h2 className="text-xl font-black">出勤登記</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <select className="form-input" value={attendanceForm.employee_no} onChange={(e) => setAttendanceForm({ ...attendanceForm, employee_no: e.target.value })}>
                  <option value="">選擇員工</option>
                  {staffRows.map((staff) => <option key={staff.employee_no} value={staff.employee_no}>{staff.name} / {staff.employee_no}</option>)}
                </select>
                <input className="form-input" type="date" value={attendanceForm.work_date} onChange={(e) => setAttendanceForm({ ...attendanceForm, work_date: e.target.value })} />
                <input className="form-input" placeholder="上班時段" value={attendanceForm.clock_in_at} onChange={(e) => setAttendanceForm({ ...attendanceForm, clock_in_at: e.target.value })} />
                <input className="form-input" placeholder="下班時段" value={attendanceForm.clock_out_at} onChange={(e) => setAttendanceForm({ ...attendanceForm, clock_out_at: e.target.value })} />
                <input className="form-input" type="number" placeholder="遲到分鐘" value={attendanceForm.late_minutes} onChange={(e) => setAttendanceForm({ ...attendanceForm, late_minutes: e.target.value })} />
                <input className="form-input" placeholder="請假類型" value={attendanceForm.leave_type} onChange={(e) => setAttendanceForm({ ...attendanceForm, leave_type: e.target.value })} />
                <input className="form-input" type="number" placeholder="請假時數" value={attendanceForm.leave_hours} onChange={(e) => setAttendanceForm({ ...attendanceForm, leave_hours: e.target.value })} />
                <input className="form-input" type="number" placeholder="加班時數" value={attendanceForm.overtime_hours} onChange={(e) => setAttendanceForm({ ...attendanceForm, overtime_hours: e.target.value })} />
              </div>
              <button className="primary-btn" type="submit">新增出勤</button>
            </form>

            <form onSubmit={createReminder} className="card space-y-3">
              <h2 className="text-xl font-black">施工照片提醒</h2>
              <select className="form-input" value={reminderForm.employee_no} onChange={(e) => setReminderForm({ ...reminderForm, employee_no: e.target.value })}>
                <option value="">選擇技師</option>
                {staffRows.map((staff) => <option key={staff.employee_no} value={staff.employee_no}>{staff.name} / {staff.employee_no}</option>)}
              </select>
              <input className="form-input" placeholder="工單 ID，可留空" value={reminderForm.construction_order_id} onChange={(e) => setReminderForm({ ...reminderForm, construction_order_id: e.target.value })} />
              <input className="form-input" type="datetime-local" value={reminderForm.due_at} onChange={(e) => setReminderForm({ ...reminderForm, due_at: e.target.value })} />
              <input className="form-input" type="number" placeholder="逾期罰扣金額" value={reminderForm.penalty_amount} onChange={(e) => setReminderForm({ ...reminderForm, penalty_amount: e.target.value })} />
              <button className="primary-btn" type="submit">建立提醒</button>
            </form>
          </section>
        ) : null}

        <section className="card">
          <h2 className="text-xl font-black">員工清單</h2>
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
          <h2 className="text-xl font-black">薪資單紀錄</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="bg-neutral-100 text-left"><th className="p-3">員工</th><th className="p-3">月份</th><th className="p-3">實發</th><th className="p-3">PDF</th></tr></thead>
              <tbody>
                {salaryRows.map((salary) => {
                  const staff = staffRows.find((item) => item.employee_no === salary.employee_no);
                  return (
                    <tr key={salary.id} className="border-b border-neutral-200">
                      <td className="p-3">{staff?.name || salary.employee_no}</td>
                      <td className="p-3">{salary.salary_month}</td>
                      <td className="p-3 font-black text-carcare-yellow">{money(salary.net_salary)}</td>
                      <td className="p-3">{staff ? <SalaryPdfButton staff={staff} salary={salary} /> : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-black">出勤明細</h2>
            <div className="mt-4 space-y-3">
              {attendanceRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="font-black">{row.employee_no} / {row.work_date}</p>
                  <p className="text-sm text-neutral-600">遲到 {row.late_minutes || 0} 分 / 請假 {row.leave_type || "無"} {row.leave_hours || 0} 小時 / 加班 {row.overtime_hours || 0} 小時</p>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-black">照片上傳監控</h2>
            <div className="mt-4 space-y-3">
              {reminders.map((row) => (
                <div key={row.id} className={`rounded-2xl border p-4 ${row.photo_completed ? "border-neutral-200" : "border-carcare-yellow bg-carcare-yellow/10"}`}>
                  <p className="font-black">{row.employee_no} / {row.construction_order_id || "未指定工單"}</p>
                  <p className="text-sm text-neutral-600">截止：{row.due_at} / 罰扣：{money(row.penalty_amount)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="secondary-btn" type="button" onClick={() => toggleReminder(row, "photo_completed")}>{row.photo_completed ? "改為未補" : "標記已補"}</button>
                    {isHrAdmin ? <button className="secondary-btn" type="button" onClick={() => toggleReminder(row, "penalty_applied")}>{row.penalty_applied ? "取消扣薪" : "列入扣薪"}</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

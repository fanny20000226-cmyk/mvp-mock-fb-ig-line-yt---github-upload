"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SalaryPdfButton from "@/components/SalaryPdfButton";
import { supabase } from "@/lib/supabase";
import {
  clearStaffSession,
  getStaffSession,
  loadStaffAttendance,
  loadStaffPhotoReminders,
  loadStaffProfile,
  loadStaffSalary,
  money,
  type StaffAttendance,
  type StaffInfo,
  type StaffSalary,
  type WorkPhotoReminder
} from "@/lib/staff";

export default function StaffDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [salaryRows, setSalaryRows] = useState<StaffSalary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<StaffAttendance[]>([]);
  const [reminders, setReminders] = useState<WorkPhotoReminder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const session = getStaffSession();
    if (!session?.employee_no) {
      router.replace("/staff/login");
      return;
    }

    setLoading(true);
    const [profileResult, salaryResult, attendanceResult, reminderResult] = await Promise.all([
      loadStaffProfile(session.employee_no),
      loadStaffSalary(session.employee_no),
      loadStaffAttendance(session.employee_no),
      loadStaffPhotoReminders(session.employee_no)
    ]);

    setStaff((profileResult.data || null) as StaffInfo | null);
    setSalaryRows((salaryResult.data || []) as StaffSalary[]);
    setAttendanceRows((attendanceResult.data || []) as StaffAttendance[]);
    setReminders((reminderResult.data || []) as WorkPhotoReminder[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pendingReminders = useMemo(
    () => reminders.filter((item) => !item.photo_completed),
    [reminders]
  );

  async function markPhotoCompleted(id: string) {
    const { error } = await supabase
      .from("work_photo_remind")
      .update({ photo_completed: true, penalty_applied: false })
      .eq("id", id);
    if (error) return alert(error.message);
    await load();
  }

  function logout() {
    clearStaffSession();
    router.replace("/staff/login");
  }

  if (loading) {
    return <main className="min-h-screen bg-carcare-bg p-4">載入員工資料中...</main>;
  }

  if (!staff) {
    return <main className="min-h-screen bg-carcare-bg p-4">找不到員工資料。</main>;
  }

  return (
    <main className="min-h-screen bg-carcare-bg p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl bg-carcare-black p-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">PEIWAY Staff Card</p>
              <h1 className="mt-2 text-3xl font-black">{staff.name}</h1>
              <p className="mt-2 text-white/70">
                員工編號 {staff.employee_no} / {staff.position} / 所屬門市 {staff.shop_id || "未綁定"}
              </p>
            </div>
            <button type="button" onClick={logout} className="secondary-btn bg-white">
              登出
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">歷史薪資單</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{salaryRows.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">出勤紀錄</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{attendanceRows.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">待補施工照片</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{pendingReminders.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">最近實發薪資</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {money(salaryRows[0]?.net_salary || 0)}
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">個人資料</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <p>聯絡電話：{staff.phone || "-"}</p>
            <p>到職日：{staff.hire_date || "-"}</p>
            <p className="md:col-span-2">身分資料：{staff.identity_info || "僅供本人檢視，需修改請洽人資。"}</p>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">薪資專區</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="p-3">月份</th>
                  <th className="p-3">本薪</th>
                  <th className="p-3">施工獎金</th>
                  <th className="p-3">扣薪</th>
                  <th className="p-3">實發</th>
                  <th className="p-3">薪資單</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map((salary) => (
                  <tr key={salary.id} className="border-b border-neutral-200">
                    <td className="p-3 font-black">{salary.salary_month}</td>
                    <td className="p-3">{money(salary.base_salary)}</td>
                    <td className="p-3">{money(salary.construction_bonus)}</td>
                    <td className="p-3">
                      {money(
                        Number(salary.late_deduction || 0) +
                          Number(salary.leave_deduction || 0) +
                          Number(salary.photo_penalty || 0) +
                          Number(salary.other_deduction || 0)
                      )}
                    </td>
                    <td className="p-3 font-black text-carcare-yellow">{money(salary.net_salary)}</td>
                    <td className="p-3">
                      <SalaryPdfButton staff={staff} salary={salary} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!salaryRows.length ? <p className="p-6 text-center text-neutral-500">尚無薪資單。</p> : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-black">出勤紀錄</h2>
            <div className="mt-4 space-y-3">
              {attendanceRows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="font-black">{row.work_date}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    上班 {row.clock_in_at || "-"} / 下班 {row.clock_out_at || "-"} / 遲到 {row.late_minutes || 0} 分
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    請假 {row.leave_type || "無"} {row.leave_hours || 0} 小時 / 加班 {row.overtime_hours || 0} 小時
                  </p>
                </div>
              ))}
              {!attendanceRows.length ? <p className="text-neutral-500">尚無出勤紀錄。</p> : null}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-black">施工提醒專區</h2>
            <div className="mt-4 space-y-3">
              {reminders.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border p-4 ${
                    row.photo_completed ? "border-neutral-200" : "border-carcare-yellow bg-carcare-yellow/10"
                  }`}
                >
                  <p className="font-black">工單：{row.construction_order_id || "未指定"}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    應補齊時間：{row.due_at} / 罰扣：{money(row.penalty_amount)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    狀態：{row.photo_completed ? "已補齊" : row.penalty_applied ? "已列入扣薪" : "待補照片"}
                  </p>
                  {!row.photo_completed ? (
                    <button type="button" className="primary-btn mt-3" onClick={() => markPhotoCompleted(row.id)}>
                      標記已補齊照片
                    </button>
                  ) : null}
                </div>
              ))}
              {!reminders.length ? <p className="text-neutral-500">目前沒有照片提醒。</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

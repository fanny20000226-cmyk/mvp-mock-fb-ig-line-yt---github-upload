"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SalaryPdfButton from "@/components/SalaryPdfButton";
import { supabase } from "@/lib/supabase";
import {
  clearStaffSession,
  getStaffSession,
  loadStaffAttendance,
  loadStaffModifyRequests,
  loadStaffPhotoReminders,
  loadStaffProfile,
  loadStaffSalary,
  money,
  type StaffAttendance,
  type StaffInfo,
  type StaffModifyRequest,
  type StaffSalary,
  type WorkPhotoReminder
} from "@/lib/staff";

const changeableFields = [
  { key: "phone", label: "聯絡手機" },
  { key: "mailing_address", label: "通訊地址" },
  { key: "email", label: "電子信箱" },
  { key: "emergency_contact", label: "緊急聯絡人" },
  { key: "emergency_phone", label: "緊急聯絡電話" },
  { key: "avatar_url", label: "個人頭像 URL" }
] as const;

const lockedFields: Array<{ key: keyof StaffInfo; label: string }> = [
  { key: "id_number", label: "身分證字號" },
  { key: "household_address", label: "戶籍地址" },
  { key: "bank_account", label: "銀行帳號" },
  { key: "bank_branch", label: "銀行分行" },
  { key: "labor_insurance_status", label: "勞保投保狀態" },
  { key: "labor_health_no", label: "勞健保號碼" },
  { key: "hire_date", label: "到職日期" },
  { key: "probation_end_date", label: "試用到期日" },
  { key: "contract_end_date", label: "合約到期日" },
  { key: "position", label: "職位" },
  { key: "employee_no", label: "員工編號" }
];

const currentMonth = new Date().toISOString().slice(0, 7);

export default function StaffDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [salaryRows, setSalaryRows] = useState<StaffSalary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<StaffAttendance[]>([]);
  const [reminders, setReminders] = useState<WorkPhotoReminder[]>([]);
  const [requests, setRequests] = useState<StaffModifyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [requestForm, setRequestForm] = useState({
    field_name: "phone",
    new_value: "",
    request_note: ""
  });

  async function load() {
    const session = getStaffSession();
    if (!session?.employee_no) {
      router.replace("/staff/login");
      return;
    }

    setLoading(true);
    const profileResult = await loadStaffProfile(session.employee_no);
    const profile = (profileResult.data || null) as StaffInfo | null;

    const [salaryResult, attendanceResult, reminderResult, requestResult] = await Promise.all([
      loadStaffSalary(session.employee_no),
      loadStaffAttendance(session.employee_no),
      loadStaffPhotoReminders(session.employee_no),
      profile?.id ? loadStaffModifyRequests(profile.id) : Promise.resolve({ data: [] })
    ]);

    setStaff(profile);
    setSalaryRows((salaryResult.data || []) as StaffSalary[]);
    setAttendanceRows((attendanceResult.data || []) as StaffAttendance[]);
    setReminders((reminderResult.data || []) as WorkPhotoReminder[]);
    setRequests((requestResult.data || []) as StaffModifyRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const pendingReminders = useMemo(() => reminders.filter((item) => !item.photo_completed), [reminders]);
  const monthAttendance = useMemo(
    () => attendanceRows.filter((row) => row.work_date?.startsWith(month)),
    [attendanceRows, month]
  );

  async function submitModifyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staff) return;
    if (!requestForm.new_value.trim()) return alert("請輸入要申請變更的新內容。");

    const field = changeableFields.find((item) => item.key === requestForm.field_name);
    if (!field) return alert("此欄位不開放員工自行申請變更。");

    const { error } = await supabase.from("staff_info_modify_request").insert({
      staff_id: staff.id,
      employee_no: staff.employee_no,
      field_name: requestForm.field_name,
      new_value: requestForm.new_value.trim(),
      request_note: requestForm.request_note.trim(),
      review_status: "pending"
    });

    if (error) return alert(error.message);
    setRequestForm({ field_name: "phone", new_value: "", request_note: "" });
    await load();
  }

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

  if (loading) return <main className="min-h-screen bg-carcare-bg p-4">載入員工資料中...</main>;
  if (!staff) return <main className="min-h-screen bg-carcare-bg p-4">找不到員工資料。</main>;

  return (
    <main className="min-h-screen bg-carcare-bg p-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl bg-carcare-black p-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-3xl border border-white/20 bg-white/10">
                {staff.avatar_url ? (
                  <div
                    aria-label={staff.name}
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${staff.avatar_url})` }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-carcare-yellow">
                    {staff.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-black text-carcare-yellow">PEIWAY Staff Card</p>
                <h1 className="mt-2 text-3xl font-black">{staff.name}</h1>
                <p className="mt-2 text-white/70">
                  員工編號 {staff.employee_no} / {staff.position} / 所屬門市 {staff.shop_id || "未綁定"}
                </p>
              </div>
            </div>
            <button type="button" onClick={logout} className="secondary-btn bg-white">
              登出
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">薪資月份</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{salaryRows.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">出勤紀錄</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{attendanceRows.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">施工照片待辦</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{pendingReminders.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">最新實發薪資</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{money(salaryRows[0]?.net_salary || 0)}</p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="card">
            <h2 className="text-xl font-black">個人人事資料總覽</h2>
            <p className="mt-1 text-sm text-neutral-500">下列核心欄位僅可檢視，需由人資維護。</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {lockedFields.map((field) => (
                <div key={field.key} className="rounded-2xl border border-neutral-200 p-3">
                  <p className="text-xs text-neutral-500">{field.label}</p>
                  <p className="mt-1 font-black">{String(staff[field.key] || "-")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-black">申請修改個人資料</h2>
            <p className="mt-1 text-sm text-neutral-500">送出後需人資審核，核准後才會更新正式資料。</p>
            <form onSubmit={submitModifyRequest} className="mt-4 space-y-3">
              <select
                className="form-input"
                value={requestForm.field_name}
                onChange={(event) => setRequestForm({ ...requestForm, field_name: event.target.value })}
              >
                {changeableFields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>
              <textarea
                className="form-input min-h-24"
                placeholder="新內容"
                value={requestForm.new_value}
                onChange={(event) => setRequestForm({ ...requestForm, new_value: event.target.value })}
              />
              <textarea
                className="form-input min-h-20"
                placeholder="申請備註"
                value={requestForm.request_note}
                onChange={(event) => setRequestForm({ ...requestForm, request_note: event.target.value })}
              />
              <button type="submit" className="primary-btn w-full">
                送出變更申請
              </button>
            </form>
            <div className="mt-5 space-y-2">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="rounded-2xl border border-neutral-200 p-3 text-sm">
                  <p className="font-black">
                    {changeableFields.find((item) => item.key === request.field_name)?.label || request.field_name}
                    <span className="ml-2 rounded-full bg-carcare-yellow px-2 py-1 text-xs text-carcare-black">
                      {request.review_status === "pending" ? "待審核" : request.review_status === "approved" ? "核准" : "駁回"}
                    </span>
                  </p>
                  <p className="mt-1 text-neutral-600">{request.new_value}</p>
                  {request.review_note ? <p className="mt-1 text-neutral-500">審核備註：{request.review_note}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black">薪資專區</h2>
              <p className="mt-1 text-sm text-neutral-500">僅顯示自己的薪資單，支援 PDF 下載與列印。</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="p-3">月份</th>
                  <th className="p-3">本薪</th>
                  <th className="p-3">施工獎金</th>
                  <th className="p-3">加班津貼</th>
                  <th className="p-3">扣減合計</th>
                  <th className="p-3">實發薪資</th>
                  <th className="p-3">薪資單</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map((salary) => {
                  const deductions =
                    Number(salary.late_deduction || 0) +
                    Number(salary.leave_deduction || 0) +
                    Number(salary.photo_penalty || 0) +
                    Number(salary.other_deduction || 0);
                  return (
                    <tr key={salary.id} className="border-b border-neutral-200">
                      <td className="p-3 font-black">{salary.salary_month}</td>
                      <td className="p-3">{money(salary.base_salary)}</td>
                      <td className="p-3">{money(salary.construction_bonus)}</td>
                      <td className="p-3">{money(salary.overtime_pay)}</td>
                      <td className="p-3">{money(deductions)}</td>
                      <td className="p-3 font-black text-carcare-yellow">{money(salary.net_salary)}</td>
                      <td className="p-3">
                        <SalaryPdfButton staff={staff} salary={salary} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!salaryRows.length ? <p className="p-6 text-center text-neutral-500">目前沒有薪資資料。</p> : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-black">出勤紀錄</h2>
              <input className="form-input md:w-48" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </div>
            <div className="mt-4 space-y-3">
              {monthAttendance.map((row) => (
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
              {!monthAttendance.length ? <p className="text-neutral-500">目前沒有此月份出勤紀錄。</p> : null}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-black">施工待辦提醒</h2>
            <p className="mt-1 text-sm text-neutral-500">施工完畢 24 小時內需補齊施工前後照片。</p>
            <div className="mt-4 space-y-3">
              {reminders.map((row) => (
                <div
                  key={row.id}
                  className={`rounded-2xl border p-4 ${
                    row.photo_completed ? "border-neutral-200" : "border-carcare-yellow bg-carcare-yellow/10"
                  }`}
                >
                  <p className="font-black">工單：{row.construction_order_id || "未綁定"}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    應補齊期限：{row.due_at} / 罰扣：{money(row.penalty_amount)}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    狀態：{row.photo_completed ? "已補齊" : row.penalty_applied ? "已逾期扣薪" : "待補照片"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.construction_order_id ? (
                      <Link href="/operations/construction" className="secondary-btn">
                        前往施工單
                      </Link>
                    ) : null}
                    {!row.photo_completed ? (
                      <button type="button" className="primary-btn" onClick={() => markPhotoCompleted(row.id)}>
                        標記已補齊照片
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {!reminders.length ? <p className="text-neutral-500">目前沒有施工照片提醒。</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

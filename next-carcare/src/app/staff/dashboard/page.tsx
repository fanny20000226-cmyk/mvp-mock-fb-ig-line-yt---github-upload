"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SalaryPdfButton from "@/components/SalaryPdfButton";
import { supabase } from "@/lib/supabase";
import {
  clearStaffSession,
  getStaffSession,
  loadStaffAttendance,
  loadStaffModifyRequests,
  loadStaffProfile,
  loadStaffSalary,
  money,
type StaffAttendance,
  type StaffInfo,
  type StaffModifyRequest,
  type StaffSalary
} from "@/lib/staff";

type StaffAppointment = {
  id: string;
  appointment_no: string;
  appoint_date: string;
  appoint_time: string;
  customer_name: string | null;
  license_plate: string | null;
  car_brand: string | null;
  car_model: string | null;
  service_content: string;
  status: string;
};

const changeableFields = [
  { key: "phone", label: "聯絡手機" },
  { key: "mailing_address", label: "通訊地址" },
  { key: "email", label: "電子信箱" },
  { key: "emergency_contact", label: "緊急聯絡人" },
  { key: "emergency_phone", label: "緊急聯絡電話" },
  { key: "avatar_url", label: "個人頭像URL" }
] as const;

const lockedFields: Array<{ key: keyof StaffInfo; label: string }> = [
  { key: "id_number", label: "身分證字號" },
  { key: "household_address", label: "戶籍地址" },
  { key: "bank_account", label: "銀行帳號" },
  { key: "bank_branch", label: "銀行分行" },
  { key: "labor_insurance_status", label: "勞保投保狀態" },
  { key: "labor_health_no", label: "勞健保號碼" },
  { key: "hire_date", label: "到職日" },
  { key: "probation_end_date", label: "試用到期日" },
  { key: "contract_end_date", label: "合約到期日" },
  { key: "position", label: "職稱" },
  { key: "employee_no", label: "員工編號" }
];

const currentMonth = new Date().toISOString().slice(0, 7);

function requestStatusLabel(status: StaffModifyRequest["review_status"]) {
  if (status === "approved") return "已核准";
  if (status === "rejected") return "已駁回";
  return "待審核";
}

export default function StaffDashboardPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [salaryRows, setSalaryRows] = useState<StaffSalary[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<StaffAttendance[]>([]);
  const [appointmentRows, setAppointmentRows] = useState<StaffAppointment[]>([]);
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

    const [salaryResult, attendanceResult, requestResult, appointmentResult] = await Promise.all([
      loadStaffSalary(session.employee_no),
      loadStaffAttendance(session.employee_no),
      profile?.id ? loadStaffModifyRequests(profile.id) : Promise.resolve({ data: [] }),
      supabase
        .from("appointments")
        .select("id, appointment_no, appoint_date, appoint_time, customer_name, license_plate, car_brand, car_model, service_content, status")
        .gte("appoint_date", new Date().toISOString().slice(0, 10))
        .order("appoint_date", { ascending: true })
        .order("appoint_time", { ascending: true })
        .limit(30)
    ]);

    setStaff(profile);
    setSalaryRows((salaryResult.data || []) as StaffSalary[]);
    setAttendanceRows((attendanceResult.data || []) as StaffAttendance[]);
    setAppointmentRows(appointmentResult.error ? [] : ((appointmentResult.data || []) as StaffAppointment[]));
    setRequests((requestResult.data || []) as StaffModifyRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const monthAttendance = useMemo(
    () => attendanceRows.filter((row) => row.work_date?.startsWith(month)),
    [attendanceRows, month]
  );

  async function submitModifyRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!staff) return;
    if (!requestForm.new_value.trim()) return alert("請填寫要申請變更的新內容。");

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

  function logout() {
    clearStaffSession();
    router.replace("/staff/login");
  }

  if (loading) return <main className="min-h-screen bg-carcare-bg p-4">載入員工資料中...</main>;
  if (!staff) return <main className="min-h-screen bg-carcare-bg p-4">找不到員工資料，請重新登入。</main>;

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
                  員工編號 {staff.employee_no} / {staff.position} / 門市 {staff.shop_id || "-"}
                </p>
              </div>
            </div>
            <button type="button" onClick={logout} className="secondary-btn bg-white">
              登出
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="card"><p className="text-sm text-neutral-500">薪資紀錄</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{salaryRows.length}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">出勤紀錄</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{attendanceRows.length}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">最近實領薪資</p><p className="mt-2 text-3xl font-black text-carcare-yellow">{money(salaryRows[0]?.net_salary || 0)}</p></div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <div className="card">
            <h2 className="text-xl font-black">個人人事資料</h2>
            <p className="mt-1 text-sm text-neutral-500">以下欄位僅供檢視，如需變更請送出資料變更申請。</p>
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
            <h2 className="text-xl font-black">資料變更申請</h2>
            <p className="mt-1 text-sm text-neutral-500">送出後會交由人資審核，核准前正式資料不會被改動。</p>
            <form onSubmit={submitModifyRequest} className="mt-4 space-y-3">
              <select
                className="form-input"
                value={requestForm.field_name}
                onChange={(event) => setRequestForm({ ...requestForm, field_name: event.target.value })}
              >
                {changeableFields.map((field) => (
                  <option key={field.key} value={field.key}>{field.label}</option>
                ))}
              </select>
              <textarea className="form-input min-h-24" placeholder="新內容" value={requestForm.new_value} onChange={(event) => setRequestForm({ ...requestForm, new_value: event.target.value })} />
              <textarea className="form-input min-h-20" placeholder="申請備註" value={requestForm.request_note} onChange={(event) => setRequestForm({ ...requestForm, request_note: event.target.value })} />
              <button type="submit" className="primary-btn w-full">送出變更申請</button>
            </form>
            <div className="mt-5 space-y-2">
              {requests.slice(0, 5).map((request) => (
                <div key={request.id} className="rounded-2xl border border-neutral-200 p-3 text-sm">
                  <p className="font-black">
                    {changeableFields.find((item) => item.key === request.field_name)?.label || request.field_name}
                    <span className="ml-2 rounded-full bg-carcare-yellow px-2 py-1 text-xs text-carcare-black">
                      {requestStatusLabel(request.review_status)}
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
          <h2 className="text-xl font-black">薪資專區</h2>
          <p className="mt-1 text-sm text-neutral-500">可查詢歷史月份薪資紀錄，並下載個人薪資單 PDF。</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-neutral-100 text-left">
                  <th className="p-3">月份</th>
                  <th className="p-3">應給總額</th>
                  <th className="p-3">應扣總額</th>
                  <th className="p-3">實領金額</th>
                  <th className="p-3">薪資單</th>
                </tr>
              </thead>
              <tbody>
                {salaryRows.map((salary) => (
                  <tr key={salary.id} className="border-b border-neutral-200">
                    <td className="p-3 font-black">{salary.salary_month}</td>
                    <td className="p-3">{money(salary.gross_amount)}</td>
                    <td className="p-3">{money(salary.deduction_amount)}</td>
                    <td className="p-3 font-black text-carcare-yellow">{money(salary.net_salary)}</td>
                    <td className="p-3"><SalaryPdfButton staff={staff} salary={salary} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!salaryRows.length ? <p className="p-6 text-center text-neutral-500">目前沒有薪資資料。</p> : null}
          </div>
        </section>

        <section className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-black">出勤紀錄</h2>
            <input className="form-input md:w-48" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <div className="mt-4 space-y-3">
            {monthAttendance.map((row) => (
              <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                <p className="font-black">{row.work_date}</p>
                <p className="mt-1 text-sm text-neutral-600">上班 {row.clock_in_at || "-"} / 下班 {row.clock_out_at || "-"} / 遲到 {row.late_minutes || 0} 分鐘</p>
                <p className="mt-1 text-sm text-neutral-600">請假 {row.leave_type || "-"} {row.leave_hours || 0} 小時 / 加班 {row.overtime_hours || 0} 小時</p>
              </div>
            ))}
            {!monthAttendance.length ? <p className="text-neutral-500">目前沒有這個月份的出勤紀錄。</p> : null}
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">預約行事曆檢視</h2>
          <p className="mt-1 text-sm text-neutral-500">員工端僅提供檢視，預約新增、編輯與刪除請由管理/店長帳號處理。</p>
          <div className="mt-4 space-y-3">
            {appointmentRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-black">{row.appoint_date} {row.appoint_time} / {row.appointment_no}</p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {row.customer_name || "-"} / {row.license_plate || "-"} / {[row.car_brand, row.car_model].filter(Boolean).join(" ") || "-"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">{row.service_content}</p>
                  </div>
                  <span className="rounded-full bg-carcare-yellow px-3 py-1 text-xs font-black text-carcare-black">
                    {row.status}
                  </span>
                </div>
              </div>
            ))}
            {!appointmentRows.length ? <p className="text-neutral-500">目前沒有可檢視的近期預約。</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

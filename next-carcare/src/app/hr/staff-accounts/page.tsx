"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { type StaffInfo, type StaffModifyRequest } from "@/lib/staff";
import { supabase } from "@/lib/supabase";

type ShopRow = { id: string; name: string };

const positionOptions = [
  { value: "shop_manager", label: "店長" },
  { value: "vice_manager", label: "副店長" },
  { value: "frontdesk", label: "前台接待" },
  { value: "technician", label: "施工技師" },
  { value: "worker", label: "一般員工" }
];

const requestFieldLabels: Record<string, string> = {
  phone: "聯絡手機",
  mailing_address: "通訊地址",
  email: "電子信箱",
  emergency_contact: "緊急聯絡人",
  emergency_phone: "緊急聯絡電話",
  avatar_url: "個人頭像 URL"
};

const emptyForm = {
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
  avatar_url: "",
  hire_date: "",
  probation_end_date: "",
  labor_insurance_status: "",
  labor_health_no: "",
  contract_end_date: ""
};

function cleanValue(value: string) {
  const nextValue = value.trim();
  return nextValue || null;
}

export default function StaffAccountsPage() {
  const [profileRole, setProfileRole] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profileShopId, setProfileShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffInfo[]>([]);
  const [requests, setRequests] = useState<StaffModifyRequest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const canManage = ["admin", "hr"].includes(profileRole);
  const pendingRequests = useMemo(() => requests.filter((item) => item.review_status === "pending"), [requests]);

  async function load() {
    setLoading(true);
    const profile = await getCurrentProfile();
    setProfileRole(profile?.role || "");
    setProfileId(profile?.id || null);
    setProfileShopId(profile?.shop_id || null);

    const [shopResult, staffResult, requestResult] = await Promise.all([
      supabase.from("shops").select("id, name").order("name"),
      supabase
        .from("staff_info")
        .select(
          "id, employee_no, name, shop_id, position, phone, identity_info, id_number, household_address, mailing_address, email, emergency_contact, emergency_phone, bank_account, bank_branch, avatar_url, hire_date, probation_end_date, labor_insurance_status, labor_health_no, contract_end_date, created_by, resigned"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("staff_info_modify_request")
        .select("id, staff_id, employee_no, field_name, new_value, request_note, requested_at, review_status, reviewer_id, review_note, reviewed_at")
        .order("requested_at", { ascending: false })
    ]);

    const allStaff = (staffResult.data || []) as StaffInfo[];
    const scopedStaff =
      profile?.role === "admin" || profile?.role === "hr"
        ? allStaff
        : allStaff.filter((staff) => staff.shop_id === profile?.shop_id);

    setShops((shopResult.data || []) as ShopRow[]);
    setStaffRows(scopedStaff);
    setRequests((requestResult.data || []) as StaffModifyRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage) return alert("只有人資或總管理員可以建立員工帳號。");
    if (!form.employee_no.trim()) return alert("請輸入員工編號。");
    if (!form.password_hash.trim()) return alert("請輸入員工初始密碼。");
    if (!form.name.trim()) return alert("請輸入員工姓名。");

    const staffShopId = form.shop_id || profileShopId;
    if (!staffShopId) return alert("請選擇員工所屬門市。");

    const { error } = await supabase.from("staff_info").insert({
      employee_no: form.employee_no.trim(),
      password_hash: form.password_hash.trim(),
      name: form.name.trim(),
      shop_id: staffShopId,
      position: form.position,
      phone: cleanValue(form.phone),
      identity_info: cleanValue(form.identity_info),
      id_number: cleanValue(form.id_number),
      household_address: cleanValue(form.household_address),
      mailing_address: cleanValue(form.mailing_address),
      email: cleanValue(form.email),
      emergency_contact: cleanValue(form.emergency_contact),
      emergency_phone: cleanValue(form.emergency_phone),
      bank_account: cleanValue(form.bank_account),
      bank_branch: cleanValue(form.bank_branch),
      avatar_url: cleanValue(form.avatar_url),
      hire_date: cleanValue(form.hire_date),
      probation_end_date: cleanValue(form.probation_end_date),
      labor_insurance_status: cleanValue(form.labor_insurance_status),
      labor_health_no: cleanValue(form.labor_health_no),
      contract_end_date: cleanValue(form.contract_end_date),
      created_by: profileId,
      resigned: false
    });

    if (error) return alert(error.message);
    setForm(emptyForm);
    await load();
  }

  async function updateResigned(staff: StaffInfo, resigned: boolean) {
    if (!canManage) return alert("只有人資或總管理員可以停用或恢復員工帳號。");
    const { error } = await supabase.from("staff_info").update({ resigned }).eq("id", staff.id);
    if (error) return alert(error.message);
    await load();
  }

  async function resetPassword(staff: StaffInfo) {
    if (!canManage) return alert("只有人資或總管理員可以重設密碼。");
    const nextPassword = resetPasswords[staff.employee_no]?.trim();
    if (!nextPassword) return alert("請先輸入新密碼。");
    const { error } = await supabase.from("staff_info").update({ password_hash: nextPassword }).eq("id", staff.id);
    if (error) return alert(error.message);
    setResetPasswords({ ...resetPasswords, [staff.employee_no]: "" });
    alert("密碼已重設，員工可用新密碼登入。");
  }

  async function reviewRequest(request: StaffModifyRequest, approved: boolean) {
    if (!canManage) return alert("只有人資或總管理員可以審核變更申請。");
    const note = reviewNotes[request.id] || "";

    if (approved) {
      if (!requestFieldLabels[request.field_name]) return alert("此欄位不在允許變更清單內。");
      const updateResult = await supabase
        .from("staff_info")
        .update({ [request.field_name]: request.new_value })
        .eq("id", request.staff_id);
      if (updateResult.error) return alert(updateResult.error.message);
    }

    const { error } = await supabase
      .from("staff_info_modify_request")
      .update({
        review_status: approved ? "approved" : "rejected",
        reviewer_id: profileId,
        review_note: note,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", request.id);

    if (error) return alert(error.message);
    await load();
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">HR Staff Portal</p>
              <h1 className="text-2xl font-black">員工帳號與人事總檔</h1>
              <p className="mt-1 text-sm text-neutral-500">
                人資在這裡建立完整員工資料，員工再用員工編號與密碼登入個人後台。
              </p>
            </div>
            <Link href="/staff/login" className="primary-btn text-center">
              打開員工後台登入
            </Link>
          </div>
        </section>

        {canManage ? (
          <form onSubmit={createStaff} className="card space-y-4">
            <div>
              <h2 className="text-xl font-black">新增完整員工資料</h2>
              <p className="mt-1 text-sm text-neutral-500">員工編號會作為登入帳號，密碼日後可在清單中重設。</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label="員工編號" value={form.employee_no} onChange={(value) => setForm({ ...form, employee_no: value })} />
              <Field label="初始密碼" type="password" value={form.password_hash} onChange={(value) => setForm({ ...form, password_hash: value })} />
              <Field label="姓名" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
              <Field label="聯絡手機" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <select className="form-input" value={form.shop_id} onChange={(event) => setForm({ ...form, shop_id: event.target.value })}>
                <option value="">使用目前登入門市</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <select className="form-input" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })}>
                {positionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Field label="身分證字號" value={form.id_number} onChange={(value) => setForm({ ...form, id_number: value })} />
              <Field label="電子信箱" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Field label="戶籍地址" value={form.household_address} onChange={(value) => setForm({ ...form, household_address: value })} />
              <Field label="通訊地址" value={form.mailing_address} onChange={(value) => setForm({ ...form, mailing_address: value })} />
              <Field label="緊急聯絡人" value={form.emergency_contact} onChange={(value) => setForm({ ...form, emergency_contact: value })} />
              <Field label="緊急聯絡電話" value={form.emergency_phone} onChange={(value) => setForm({ ...form, emergency_phone: value })} />
              <Field label="銀行帳號" value={form.bank_account} onChange={(value) => setForm({ ...form, bank_account: value })} />
              <Field label="銀行分行名稱" value={form.bank_branch} onChange={(value) => setForm({ ...form, bank_branch: value })} />
              <Field label="員工大頭照 URL" value={form.avatar_url} onChange={(value) => setForm({ ...form, avatar_url: value })} />
              <Field label="到職日期" type="date" value={form.hire_date} onChange={(value) => setForm({ ...form, hire_date: value })} />
              <Field label="試用到期日" type="date" value={form.probation_end_date} onChange={(value) => setForm({ ...form, probation_end_date: value })} />
              <Field label="勞保投保狀態" value={form.labor_insurance_status} onChange={(value) => setForm({ ...form, labor_insurance_status: value })} />
              <Field label="勞健保號碼" value={form.labor_health_no} onChange={(value) => setForm({ ...form, labor_health_no: value })} />
              <Field label="合約到期日" type="date" value={form.contract_end_date} onChange={(value) => setForm({ ...form, contract_end_date: value })} />
              <Field label="身分資料備註" value={form.identity_info} onChange={(value) => setForm({ ...form, identity_info: value })} />
            </div>
            <button className="primary-btn" type="submit">
              建立員工帳號與人事資料
            </button>
          </form>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <Stat title="員工帳號數" value={staffRows.length} />
          <Stat title="可登入" value={staffRows.filter((row) => !row.resigned).length} />
          <Stat title="已停用" value={staffRows.filter((row) => row.resigned).length} />
          <Stat title="待審核變更" value={pendingRequests.length} />
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black">員工帳號清單</h2>
              <p className="mt-1 text-sm text-neutral-500">員工使用「員工編號 + 密碼」登入，不需要電子信箱。</p>
            </div>
            {loading ? <p className="text-sm text-neutral-500">載入中...</p> : null}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>員工編號</th>
                  <th>姓名</th>
                  <th>職位</th>
                  <th>電話</th>
                  <th>信箱</th>
                  <th>到職日</th>
                  <th>狀態</th>
                  <th>重設密碼</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((staff) => (
                  <tr key={staff.id}>
                    <td>{staff.employee_no}</td>
                    <td>{staff.name}</td>
                    <td>{positionOptions.find((item) => item.value === staff.position)?.label || staff.position}</td>
                    <td>{staff.phone || "-"}</td>
                    <td>{staff.email || "-"}</td>
                    <td>{staff.hire_date || "-"}</td>
                    <td>{staff.resigned ? "已停用" : "可登入"}</td>
                    <td>
                      {canManage ? (
                        <input
                          className="form-input min-w-[160px]"
                          type="password"
                          placeholder="輸入新密碼"
                          value={resetPasswords[staff.employee_no] || ""}
                          onChange={(event) =>
                            setResetPasswords({ ...resetPasswords, [staff.employee_no]: event.target.value })
                          }
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {canManage ? (
                          <>
                            <button className="secondary-btn" type="button" onClick={() => resetPassword(staff)}>
                              重設
                            </button>
                            <button
                              className="secondary-btn"
                              type="button"
                              onClick={() => updateResigned(staff, !staff.resigned)}
                            >
                              {staff.resigned ? "恢復" : "停用"}
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-neutral-500">僅可查看</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!staffRows.length ? (
                  <tr>
                    <td colSpan={9}>目前還沒有員工帳號，請先由人資新增第一位員工。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="text-xl font-black">員工資料變更申請審核</h2>
          <p className="mt-1 text-sm text-neutral-500">核准後才會寫回員工正式人事資料；駁回則保留申請紀錄。</p>
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-neutral-200 p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
                  <div>
                    <p className="font-black">
                      {request.employee_no || request.staff_id} / {requestFieldLabels[request.field_name] || request.field_name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">新內容：{request.new_value}</p>
                    <p className="mt-1 text-sm text-neutral-500">申請備註：{request.request_note || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">狀態</p>
                    <p className="mt-1 font-black text-carcare-yellow">
                      {request.review_status === "pending" ? "待審核" : request.review_status === "approved" ? "已核准" : "已駁回"}
                    </p>
                    {request.review_note ? <p className="mt-1 text-sm text-neutral-500">審核備註：{request.review_note}</p> : null}
                  </div>
                  <div className="space-y-2">
                    {request.review_status === "pending" && canManage ? (
                      <>
                        <input
                          className="form-input"
                          placeholder="審核備註"
                          value={reviewNotes[request.id] || ""}
                          onChange={(event) => setReviewNotes({ ...reviewNotes, [request.id]: event.target.value })}
                        />
                        <div className="flex gap-2">
                          <button className="primary-btn flex-1" type="button" onClick={() => reviewRequest(request, true)}>
                            核准
                          </button>
                          <button className="secondary-btn flex-1" type="button" onClick={() => reviewRequest(request, false)}>
                            駁回
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-neutral-500">已完成審核</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!requests.length ? <p className="text-neutral-500">目前沒有員工資料變更申請。</p> : null}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      className="form-input"
      type={type}
      placeholder={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-neutral-500">{title}</p>
      <p className="mt-2 text-3xl font-black text-carcare-yellow">{value}</p>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { type StaffInfo } from "@/lib/staff";
import { supabase } from "@/lib/supabase";

type ShopRow = { id: string; name: string };

const positionOptions = [
  { value: "shop_manager", label: "店長" },
  { value: "vice_manager", label: "副店長" },
  { value: "frontdesk", label: "前台接待" },
  { value: "technician", label: "施工技師" },
  { value: "worker", label: "一般員工" }
];

const emptyForm = {
  employee_no: "",
  password_hash: "",
  name: "",
  shop_id: "",
  position: "technician",
  phone: "",
  identity_info: "",
  hire_date: ""
};

export default function StaffAccountsPage() {
  const [profileRole, setProfileRole] = useState("");
  const [profileShopId, setProfileShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffInfo[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const canManage = ["admin", "hr"].includes(profileRole);

  async function load() {
    setLoading(true);
    const profile = await getCurrentProfile();
    setProfileRole(profile?.role || "");
    setProfileShopId(profile?.shop_id || null);

    const [shopResult, staffResult] = await Promise.all([
      supabase.from("shops").select("id, name").order("name"),
      supabase
        .from("staff_info")
        .select("id, employee_no, name, shop_id, position, phone, identity_info, hire_date, resigned")
        .order("created_at", { ascending: false })
    ]);

    const allStaff = (staffResult.data || []) as StaffInfo[];
    const scopedStaff =
      profile?.role === "admin" || profile?.role === "hr"
        ? allStaff
        : allStaff.filter((staff) => staff.shop_id === profile?.shop_id);

    setShops((shopResult.data || []) as ShopRow[]);
    setStaffRows(scopedStaff);
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
      ...form,
      employee_no: form.employee_no.trim(),
      password_hash: form.password_hash.trim(),
      name: form.name.trim(),
      shop_id: staffShopId,
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

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">HR Staff Portal</p>
              <h1 className="text-2xl font-black">員工後台帳號管理</h1>
              <p className="mt-1 text-sm text-neutral-500">
                先在這裡建立員工編號與初始密碼，員工就能登入個人後台查看薪資、出勤與施工提醒。
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
              <h2 className="text-xl font-black">新增員工登入帳號</h2>
              <p className="mt-1 text-sm text-neutral-500">
                員工編號就是登入帳號，初始密碼建立後可在下方重設。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                className="form-input"
                placeholder="員工編號，例如 EMP001"
                value={form.employee_no}
                onChange={(event) => setForm({ ...form, employee_no: event.target.value })}
              />
              <input
                className="form-input"
                type="password"
                placeholder="員工初始密碼"
                value={form.password_hash}
                onChange={(event) => setForm({ ...form, password_hash: event.target.value })}
              />
              <input
                className="form-input"
                placeholder="員工姓名"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <input
                className="form-input"
                placeholder="聯絡電話"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
              <select
                className="form-input"
                value={form.shop_id}
                onChange={(event) => setForm({ ...form, shop_id: event.target.value })}
              >
                <option value="">使用目前登入門市</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
              <select
                className="form-input"
                value={form.position}
                onChange={(event) => setForm({ ...form, position: event.target.value })}
              >
                {positionOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <input
                className="form-input"
                type="date"
                value={form.hire_date}
                onChange={(event) => setForm({ ...form, hire_date: event.target.value })}
              />
              <input
                className="form-input"
                placeholder="身分資料 / 備註"
                value={form.identity_info}
                onChange={(event) => setForm({ ...form, identity_info: event.target.value })}
              />
            </div>
            <button className="primary-btn" type="submit">
              建立員工帳號
            </button>
          </form>
        ) : null}

        <section className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">員工帳號數</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">{staffRows.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">可登入</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {staffRows.filter((row) => !row.resigned).length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">已停用</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">
              {staffRows.filter((row) => row.resigned).length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">本頁用途</p>
            <p className="mt-2 text-lg font-black">建立登入資料</p>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black">員工後台登入帳號清單</h2>
              <p className="mt-1 text-sm text-neutral-500">
                員工使用「員工編號 + 密碼」登入，不需要電子信箱。
              </p>
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
                    <td colSpan={7}>目前還沒有員工帳號，請先由人資新增第一位員工。</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

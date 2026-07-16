"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { supabase } from "@/lib/supabase";
import { roleLabels, type Role } from "@/lib/permissions";

type UserRow = {
  id: string;
  account: string;
  name: string;
  role: Role;
  shop_id: string | null;
  active: boolean;
};

export default function PermissionsPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    account: "",
    name: "",
    role: "worker" as Role,
    shop_id: ""
  });

  async function load() {
    const { data } = await supabase
      .from("users")
      .select("id, account, name, role, shop_id, active")
      .order("created_at", { ascending: false });
    setRows((data || []) as UserRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return alert("請先登入管理員帳號。");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...form,
        shop_id: form.shop_id || null
      })
    });

    const json = await res.json();
    if (!res.ok) return alert(json.message || "建立帳號失敗。");
    setForm({ email: "", password: "", account: "", name: "", role: "worker", shop_id: "" });
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">系統管理</p>
            <h1 className="text-2xl font-black">權限管理</h1>
          </div>
          <button onClick={createUser} className="primary-btn">新增使用者</button>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <input className="form-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="form-input" placeholder="登入密碼" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="form-input" placeholder="帳號代稱，例如 amy" value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} />
          <input className="form-input" placeholder="姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="admin">總管理員</option>
            <option value="finance">財務</option>
            <option value="hr">人資</option>
            <option value="shop_manager">店長</option>
            <option value="vice_manager">副店長</option>
            <option value="worker">施工人員</option>
          </select>
          <input className="form-input" placeholder="shop_id，可留空" value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>帳號</th>
                <th>姓名</th>
                <th>角色</th>
                <th>門店</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.account}</td>
                  <td>{row.name}</td>
                  <td>{roleLabels[row.role]}</td>
                  <td>{row.shop_id || "未綁定"}</td>
                  <td>{row.active ? "啟用" : "停用"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="text-center text-neutral-500">
                    尚未有使用者資料。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

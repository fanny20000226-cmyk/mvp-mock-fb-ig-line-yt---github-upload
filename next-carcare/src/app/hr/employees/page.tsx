"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listEmployees } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type EmployeeRow = {
  id: string;
  employee_no: string | null;
  name: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  active: boolean;
};

export default function EmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [form, setForm] = useState({
    employee_no: "",
    name: "",
    phone: "",
    department: "",
    position: ""
  });

  async function load() {
    const { data } = await listEmployees();
    setRows((data || []) as EmployeeRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createEmployee() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請先確認帳號綁定門店。");
    if (!form.name) return alert("請輸入姓名。");
    const { error } = await supabase.from("employees").insert({
      shop_id: profile.shop_id,
      ...form,
      active: true
    });
    if (error) return alert(error.message);
    setForm({ employee_no: "", name: "", phone: "", department: "", position: "" });
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">人資管理</p>
            <h1 className="text-2xl font-black">人員資料</h1>
          </div>
          <button onClick={createEmployee} className="primary-btn">新增人員</button>
        </div>
        <div className="mb-5 grid gap-3 md:grid-cols-5">
          <input className="form-input" placeholder="員工編號" value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} />
          <input className="form-input" placeholder="姓名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="form-input" placeholder="電話" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="form-input" placeholder="部門" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <input className="form-input" placeholder="職稱" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>員工編號</th>
                <th>姓名</th>
                <th>電話</th>
                <th>部門</th>
                <th>職稱</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.employee_no || "-"}</td>
                  <td>{row.name}</td>
                  <td>{row.phone || "-"}</td>
                  <td>{row.department || "-"}</td>
                  <td>{row.position || "-"}</td>
                  <td>{row.active ? "啟用" : "停用"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="text-center text-neutral-500">
                    尚未建立人員資料。
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

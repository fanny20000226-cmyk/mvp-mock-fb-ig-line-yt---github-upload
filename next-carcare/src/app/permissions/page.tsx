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

  useEffect(() => {
    supabase
      .from("users")
      .select("id, account, name, role, shop_id, active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data || []) as UserRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black">權限管理</h1>
          <button className="primary-btn">新增使用者</button>
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
                  <td>{row.shop_id || "全域"}</td>
                  <td>{row.active ? "啟用" : "停用"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


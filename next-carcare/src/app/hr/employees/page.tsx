"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listEmployees } from "@/lib/db";

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

  useEffect(() => {
    listEmployees().then(({ data }) => setRows((data || []) as EmployeeRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <h1 className="mb-5 text-2xl font-black">員工資料</h1>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>員編</th>
                <th>姓名</th>
                <th>電話</th>
                <th>部門</th>
                <th>職位</th>
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
                  <td>{row.active ? "在職" : "停用"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


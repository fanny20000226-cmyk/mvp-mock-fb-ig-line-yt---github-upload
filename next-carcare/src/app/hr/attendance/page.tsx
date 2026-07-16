"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { listAttendance } from "@/lib/db";

type AttendanceRow = {
  id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  is_late: boolean;
  is_early_leave: boolean;
};

export default function AttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  useEffect(() => {
    listAttendance().then(({ data }) => setRows((data || []) as AttendanceRow[]));
  }, []);

  return (
    <RequireAuth>
      <section className="card">
        <h1 className="mb-5 text-2xl font-black">考勤紀錄</h1>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>上班</th>
                <th>下班</th>
                <th>遲到</th>
                <th>早退</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.work_date}</td>
                  <td>{row.clock_in_at || "-"}</td>
                  <td>{row.clock_out_at || "-"}</td>
                  <td>{row.is_late ? "是" : "否"}</td>
                  <td>{row.is_early_leave ? "是" : "否"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}


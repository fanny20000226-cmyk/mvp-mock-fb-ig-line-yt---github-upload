"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listAttendance } from "@/lib/db";
import { supabase } from "@/lib/supabase";

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

  async function load() {
    const { data } = await listAttendance();
    setRows((data || []) as AttendanceRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function clockIn() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("請先綁定門店");
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", profile.id)
      .single();
    if (!employee) return alert("找不到員工資料");
    const { error } = await supabase.from("attendance").insert({
      shop_id: profile.shop_id,
      employee_id: employee.id,
      user_id: profile.id,
      work_date: new Date().toISOString().slice(0, 10),
      clock_in_at: new Date().toISOString(),
      clock_type: "normal"
    });
    if (error) return alert(error.message);
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-2xl font-black">考勤紀錄</h1>
          <button onClick={clockIn} className="primary-btn">上班打卡</button>
        </div>
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

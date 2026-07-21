"use client";

import type { StaffInfo, StaffSalary } from "@/lib/staff";
import { money } from "@/lib/staff";

export default function PeiwaySalaryPdf({ staff, salary }: { staff: StaffInfo; salary: StaffSalary }) {
  return (
    <div className="min-h-[1123px] bg-white text-neutral-950">
      <div className="flex items-center justify-between bg-[#111] px-7 py-6 text-white">
        <div className="rounded-xl border-2 border-white px-4 py-2 text-4xl font-black italic tracking-tight">
          PEI<span className="text-[#dfff00]">WAY</span>
        </div>
        <div className="text-center">
          <h2 className="text-4xl font-black tracking-wide">員工薪資單</h2>
          <p className="mt-1 text-sm text-white/70">PAYSLIP</p>
        </div>
        <div className="text-right text-sm">
          <p>薪資月份：{salary.salary_month}</p>
          <p>員工編號：{staff.employee_no}</p>
        </div>
      </div>

      <div className="space-y-5 p-7">
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">員工資料</h3>
            <InfoLine label="姓名" value={staff.name} />
            <InfoLine label="員工編號" value={staff.employee_no} />
            <InfoLine label="職位" value={staff.position} />
            <InfoLine label="聯絡電話" value={staff.phone || ""} />
          </div>
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">薪資摘要</h3>
            <InfoLine label="建檔時間" value={new Date(salary.created_at).toLocaleDateString("zh-TW")} />
            <InfoLine label="本薪" value={money(salary.base_salary)} />
            <InfoLine label="獎金" value={money(salary.construction_bonus)} />
            <InfoLine label="扣款" value={money(salary.late_deduction + salary.leave_deduction + salary.photo_penalty + salary.other_deduction)} />
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">收入項目</h3>
            <FeeLine label="固定本薪" value={money(salary.base_salary)} />
            <FeeLine label="施工提成獎金" value={money(salary.construction_bonus)} />
            <FeeLine label="加班津貼" value={money(salary.overtime_pay)} />
          </div>
          <div className="rounded-2xl border border-neutral-300 p-4">
            <h3 className="mb-3 inline-block border-b-4 border-[#ffc107] pb-1 text-xl font-black">扣減項目</h3>
            <FeeLine label="遲到扣薪" value={money(salary.late_deduction)} />
            <FeeLine label="請假扣薪" value={money(salary.leave_deduction)} />
            <FeeLine label="未上傳照片罰扣" value={money(salary.photo_penalty)} />
            <FeeLine label="其他自訂扣項" value={money(salary.other_deduction)} />
          </div>
        </section>

        <section className="rounded-2xl bg-[#111] p-5 text-center text-white">
          <p className="text-2xl font-black">本月實發薪資</p>
          <div className="mt-3 rounded-xl bg-[#ffc107] py-5 text-5xl font-black text-[#111]">
            {money(salary.net_salary)}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-300 p-5 text-sm">
          <p>本人已確認本月薪資項目、獎金與扣減明細。</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <p>員工簽名：________________</p>
            <p>日期：____ 年 ____ 月 ____ 日</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-h-10 grid-cols-[100px_1fr] border-b border-neutral-300 text-sm">
      <span className="flex items-center font-black">{label}</span>
      <span className="flex items-center px-2">{value || ""}</span>
    </div>
  );
}

function FeeLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between border-b border-neutral-200 py-3 text-sm">
      <span>{label}</span>
      <span className="font-black">{value}</span>
    </p>
  );
}

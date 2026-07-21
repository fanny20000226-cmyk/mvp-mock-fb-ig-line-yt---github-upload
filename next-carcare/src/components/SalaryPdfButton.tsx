"use client";

import { useState } from "react";
import PeiwaySalaryPdf from "@/components/PeiwaySalaryPdf";
import { exportElementToPdf } from "@/lib/pdf";
import type { StaffInfo, StaffSalary } from "@/lib/staff";

export default function SalaryPdfButton({ staff, salary }: { staff: StaffInfo; salary: StaffSalary }) {
  const [exporting, setExporting] = useState(false);
  const targetId = `salary-pdf-${salary.id}`;

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      await exportElementToPdf(targetId, `PEIWAY_薪資單_${staff.employee_no}_${salary.salary_month}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <button type="button" className="primary-btn" onClick={handleExport} disabled={exporting}>
        {exporting ? "匯出中..." : "下載薪資單PDF"}
      </button>
      <div className="fixed left-[-9999px] top-0 w-[794px] bg-white">
        <div id={targetId}>
          <PeiwaySalaryPdf staff={staff} salary={salary} />
        </div>
      </div>
    </>
  );
}

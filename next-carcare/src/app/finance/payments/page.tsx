"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listPayments } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type PaymentRow = {
  id: string;
  payment_no: string | null;
  pay_type: string;
  amount: number;
  paid_at: string;
  check_status: string;
  remark: string | null;
};

const payTypes = ["現金", "匯款", "刷卡", "訂金", "對公轉帳", "掛帳"];
const expenseTypes = ["藥水耗材", "耗材物料", "設備維修", "雜項開支", "人工支出", "房租水電"];

export default function PaymentsPage() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [form, setForm] = useState({ pay_type: "現金", amount: "", remark: "" });
  const [expenseForm, setExpenseForm] = useState({
    store: "",
    applicant: "",
    expense_type: "藥水耗材",
    pay_type: "現金",
    amount: "",
    remark: ""
  });

  async function load() {
    const { data } = await listPayments();
    setRows((data || []) as PaymentRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPayment() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請先確認帳號綁定門店。");
    if (!form.amount) return alert("請輸入收款金額。");

    const { error } = await supabase.from("payment").insert({
      shop_id: profile.shop_id,
      payment_no: `P${Date.now()}`,
      pay_type: form.pay_type,
      amount: Number(form.amount || 0),
      operator_id: profile.id,
      check_status: "pending",
      remark: form.remark
    });
    if (error) return alert(error.message);
    setForm({ pay_type: "現金", amount: "", remark: "" });
    load();
  }

  async function createExpense() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請先確認帳號綁定門店。");
    if (!expenseForm.amount) return alert("請輸入支出金額。");

    const remark = [
      "[店長支出]",
      expenseForm.store ? `門市：${expenseForm.store}` : "",
      expenseForm.applicant ? `申請人：${expenseForm.applicant}` : "",
      `支出類型：${expenseForm.expense_type}`,
      expenseForm.remark ? `備註：${expenseForm.remark}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("payment").insert({
      shop_id: profile.shop_id,
      payment_no: `E${Date.now()}`,
      pay_type: `支出-${expenseForm.pay_type}`,
      amount: -Math.abs(Number(expenseForm.amount || 0)),
      operator_id: profile.id,
      check_status: "expense_pending",
      remark
    });
    if (error) return alert(error.message);
    setExpenseForm({
      store: "",
      applicant: "",
      expense_type: "藥水耗材",
      pay_type: "現金",
      amount: "",
      remark: ""
    });
    load();
  }

  async function updateCheckStatus(row: PaymentRow, status: string) {
    const { error } = await supabase.from("payment").update({ check_status: status }).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  const incomeRows = rows.filter((row) => Number(row.amount || 0) >= 0);
  const expenseRows = rows.filter((row) => Number(row.amount || 0) < 0);
  const incomeTotal = incomeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenseTotal = expenseRows.reduce((sum, row) => sum + Math.abs(Number(row.amount || 0)), 0);
  const netTotal = incomeTotal - expenseTotal;

  function statusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: "待核銷",
      checked: "已核銷",
      expense_pending: "支出待審核",
      expense_approved: "支出已核准",
      expense_rejected: "支出已駁回",
      expense_written_off: "支出已核銷"
    };
    return labels[status] || status;
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="text-sm font-black text-neutral-500">收入合計</p>
            <p className="mt-2 text-3xl font-black text-neutral-900">${incomeTotal.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-sm font-black text-neutral-500">支出合計</p>
            <p className="mt-2 text-3xl font-black text-red-600">${expenseTotal.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-sm font-black text-neutral-500">淨額</p>
            <p className="mt-2 text-3xl font-black text-carcare-yellow">${netTotal.toLocaleString()}</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="card">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-carcare-yellow">財務管理</p>
                <h1 className="text-2xl font-black">收款核銷</h1>
              </div>
              <button onClick={createPayment} className="primary-btn">新增收款</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <select className="form-input" value={form.pay_type} onChange={(e) => setForm({ ...form, pay_type: e.target.value })}>
                {payTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <input className="form-input" placeholder="金額" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <input className="form-input" placeholder="備註，例如：訂金、尾款、補款" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </div>
          </div>

          <div className="card">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-carcare-yellow">正副店長支出</p>
                <h2 className="text-2xl font-black">支出填報</h2>
              </div>
              <button onClick={createExpense} className="primary-btn">提交支出</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="form-input" placeholder="所屬門市" value={expenseForm.store} onChange={(e) => setExpenseForm({ ...expenseForm, store: e.target.value })} />
              <input className="form-input" placeholder="申請人 / 店長姓名" value={expenseForm.applicant} onChange={(e) => setExpenseForm({ ...expenseForm, applicant: e.target.value })} />
              <select className="form-input" value={expenseForm.expense_type} onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}>
                {expenseTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              <select className="form-input" value={expenseForm.pay_type} onChange={(e) => setExpenseForm({ ...expenseForm, pay_type: e.target.value })}>
                <option>現金</option>
                <option>匯款</option>
                <option>刷卡</option>
              </select>
              <input className="form-input" placeholder="支出金額" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
              <input className="form-input" placeholder="備註 / 發票資訊" value={expenseForm.remark} onChange={(e) => setExpenseForm({ ...expenseForm, remark: e.target.value })} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">正副店長支出審核</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>支出單號</th>
                  <th>方式</th>
                  <th>金額</th>
                  <th>時間</th>
                  <th>狀態</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.payment_no || "-"}</td>
                    <td>{row.pay_type}</td>
                    <td className="font-black text-red-600">-${Math.abs(Number(row.amount || 0)).toLocaleString()}</td>
                    <td>{row.paid_at}</td>
                    <td>{statusLabel(row.check_status)}</td>
                    <td className="whitespace-pre-wrap">{row.remark || "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button className="secondary-btn" onClick={() => updateCheckStatus(row, "expense_approved")}>
                          核准
                        </button>
                        <button className="secondary-btn" onClick={() => updateCheckStatus(row, "expense_rejected")}>
                          駁回
                        </button>
                        <button className="secondary-btn" onClick={() => updateCheckStatus(row, "expense_written_off")}>
                          核銷
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!expenseRows.length ? (
                  <tr>
                    <td colSpan={7} className="text-center text-neutral-500">
                      目前尚無支出申請。
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">收款流水</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>流水號</th>
                  <th>收款方式</th>
                  <th>金額</th>
                  <th>收款時間</th>
                  <th>狀態</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {incomeRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.payment_no || "-"}</td>
                    <td>{row.pay_type}</td>
                    <td>${Number(row.amount || 0).toLocaleString()}</td>
                    <td>{row.paid_at}</td>
                    <td>{statusLabel(row.check_status)}</td>
                    <td>{row.remark || "-"}</td>
                    <td>
                      <button className="secondary-btn" onClick={() => updateCheckStatus(row, "checked")}>
                        標記核銷
                      </button>
                    </td>
                  </tr>
                ))}
                {!incomeRows.length ? (
                  <tr>
                    <td colSpan={7} className="text-center text-neutral-500">
                      尚未建立收款紀錄。
                    </td>
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

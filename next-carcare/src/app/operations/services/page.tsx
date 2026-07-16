"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listServiceItems } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  base_price: number;
  description: string | null;
  active: boolean;
};

const categories = ["基礎保養", "加購", "贈送", "外包", "其他備註"];

export default function ServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "基礎保養",
    base_price: "",
    description: ""
  });

  async function load() {
    const { data } = await listServiceItems();
    setRows((data || []) as ServiceRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createService() {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    if (!form.name) return alert("請填寫項目名稱。");

    setSaving(true);
    const { error } = await supabase.from("service_items").insert({
      shop_id: profile.shop_id,
      name: form.name,
      category: form.category,
      base_price: Number(form.base_price || 0),
      description: form.description,
      active: true
    });

    setSaving(false);
    if (error) return alert(error.message);
    setForm({ name: "", category: "基礎保養", base_price: "", description: "" });
    load();
  }

  async function toggleActive(row: ServiceRow) {
    const { error } = await supabase
      .from("service_items")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  return (
    <RequireAuth>
      <div className="space-y-6">
        <section className="card">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-carcare-yellow">套餐 / 加購 / 贈送</p>
              <h1 className="text-2xl font-black">服務價目管理</h1>
              <p className="mt-1 text-sm text-neutral-500">
                這裡新增的項目會同步到製作報價單的下拉選單。
              </p>
            </div>
            <button onClick={createService} disabled={saving} className="primary-btn">
              {saving ? "新增中..." : "新增價目項目"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className="form-input"
              placeholder="服務名稱，例如 9999 內外超值"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="form-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <input
              className="form-input"
              placeholder="金額"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="說明備註"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">目前價目</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>服務名稱</th>
                  <th>分類</th>
                  <th>金額</th>
                  <th>說明</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-black text-neutral-900">{row.name}</td>
                    <td>{row.category || "-"}</td>
                    <td>${Number(row.base_price || 0).toLocaleString()}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.active ? "上架" : "下架"}</td>
                    <td>
                      <button className="secondary-btn" onClick={() => toggleActive(row)}>
                        {row.active ? "下架" : "上架"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-500">
                      目前尚無價目項目，請先新增第一筆。
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

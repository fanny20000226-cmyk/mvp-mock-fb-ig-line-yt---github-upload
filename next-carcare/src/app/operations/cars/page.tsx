"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import CarAlbumUploader from "@/components/CarAlbumUploader";
import { getCurrentProfile } from "@/lib/auth";
import { listCars } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type CarRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_no: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
};

export default function CarsPage() {
  const [rows, setRows] = useState<CarRow[]>([]);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    plate_no: "",
    brand: "",
    model: "",
    year: "",
    color: ""
  });

  async function load() {
    const { data } = await listCars();
    setRows((data || []) as CarRow[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCar() {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門店資料，請先確認帳號綁定門店。");
    if (!form.customer_name || !form.plate_no) return alert("請輸入客戶姓名與車牌。");

    const { error } = await supabase.from("cars").insert({
      shop_id: profile.shop_id,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      plate_no: form.plate_no,
      brand: form.brand,
      model: form.model,
      year: form.year ? Number(form.year) : null,
      color: form.color
    });

    if (error) return alert(error.message);
    setForm({
      customer_name: "",
      customer_phone: "",
      plate_no: "",
      brand: "",
      model: "",
      year: "",
      color: ""
    });
    load();
  }

  return (
    <RequireAuth>
      <section className="card">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">客戶資料庫</p>
            <h1 className="text-2xl font-black">客戶車輛管理</h1>
            <p className="mt-1 text-sm text-neutral-500">
              建立客戶、車牌、車型，後續可串接報價與施工單。
            </p>
          </div>
          <button onClick={createCar} className="primary-btn">
            新增客戶車輛
          </button>
        </div>
        <CarAlbumUploader cars={rows} />
        <div className="mb-5 grid gap-3 md:grid-cols-4">
          <input className="form-input" placeholder="客戶姓名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className="form-input" placeholder="聯絡電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className="form-input" placeholder="車牌" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
          <input className="form-input" placeholder="品牌，例如 Tesla" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input className="form-input" placeholder="車型，例如 Model Y" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input className="form-input" placeholder="年份" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
          <input className="form-input" placeholder="車色" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>客戶</th>
                <th>電話</th>
                <th>車牌</th>
                <th>車型</th>
                <th>年份</th>
                <th>車色</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.customer_name}</td>
                  <td>{row.customer_phone || "-"}</td>
                  <td>{row.plate_no || "-"}</td>
                  <td>{[row.brand, row.model].filter(Boolean).join(" ") || "-"}</td>
                  <td>{row.year || "-"}</td>
                  <td>{row.color || "-"}</td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="text-center text-neutral-500">
                    尚未建立客戶車輛。
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

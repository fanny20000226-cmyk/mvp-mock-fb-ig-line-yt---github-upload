"use client";

import { useEffect, useMemo, useState } from "react";
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
const imageStart = "[image]";
const imageEnd = "[/image]";
const sortStart = "[sort]";
const sortEnd = "[/sort]";
const deletedTag = "[deleted]";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readBetween(text: string, start: string, end: string) {
  const regex = new RegExp(`${escapeRegExp(start)}([\\s\\S]*?)${escapeRegExp(end)}`);
  return text.match(regex)?.[1]?.trim() || "";
}

function parseMeta(description?: string | null) {
  const raw = description || "";
  const imageUrl = readBetween(raw, imageStart, imageEnd);
  const sortOrder = readBetween(raw, sortStart, sortEnd);
  const cleanDescription = raw
    .replace(new RegExp(`${escapeRegExp(imageStart)}[\\s\\S]*?${escapeRegExp(imageEnd)}`, "g"), "")
    .replace(new RegExp(`${escapeRegExp(sortStart)}[\\s\\S]*?${escapeRegExp(sortEnd)}`, "g"), "")
    .replace(deletedTag, "")
    .trim();

  return {
    imageUrl,
    sortOrder: Number(sortOrder || 0),
    cleanDescription,
    deleted: raw.includes(deletedTag)
  };
}

function buildDescription(description: string, imageUrl: string, sortOrder: string, deleted = false) {
  return [
    imageUrl ? `${imageStart}${imageUrl}${imageEnd}` : "",
    sortOrder ? `${sortStart}${sortOrder}${sortEnd}` : "",
    deleted ? deletedTag : "",
    description.trim()
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ServicesPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "基礎保養",
    base_price: "",
    description: "",
    image_url: "",
    sort_order: "10"
  });

  const visibleRows = useMemo(
    () =>
      rows
        .filter((row) => !parseMeta(row.description).deleted)
        .sort((a, b) => parseMeta(a.description).sortOrder - parseMeta(b.description).sortOrder),
    [rows]
  );

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
    const payload = {
      shop_id: profile.shop_id,
      name: form.name,
      category: form.category,
      base_price: Number(form.base_price || 0),
      description: buildDescription(form.description, form.image_url, form.sort_order),
      active: true
    };

    const { error } = editingId
      ? await supabase.from("service_items").update(payload).eq("id", editingId)
      : await supabase.from("service_items").insert(payload);

    setSaving(false);
    if (error) return alert(error.message);
    resetForm();
    load();
  }

  function resetForm() {
    setEditingId("");
    setForm({
      name: "",
      category: "基礎保養",
      base_price: "",
      description: "",
      image_url: "",
      sort_order: "10"
    });
  }

  function editRow(row: ServiceRow) {
    const meta = parseMeta(row.description);
    setEditingId(row.id);
    setForm({
      name: row.name,
      category: row.category || "基礎保養",
      base_price: String(row.base_price || 0),
      description: meta.cleanDescription,
      image_url: meta.imageUrl,
      sort_order: String(meta.sortOrder || 10)
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File) {
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");

    setUploading(true);
    const safeName = file.name.replace(/[^\w.\-]+/g, "-");
    const path = `${profile.shop_id}/service-menu/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from("car-images").upload(path, file, {
      upsert: false
    });
    setUploading(false);
    if (error) {
      return alert(`${error.message}\n\n如果顯示 Bucket not found，請先在 Supabase 建立 car-images 儲存桶。`);
    }

    const { data } = supabase.storage.from("car-images").getPublicUrl(path);
    setForm((current) => ({ ...current, image_url: data.publicUrl }));
  }

  async function toggleActive(row: ServiceRow) {
    const { error } = await supabase
      .from("service_items")
      .update({ active: !row.active })
      .eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  async function softDelete(row: ServiceRow) {
    const ok = window.confirm(`確定要刪除「${row.name}」嗎？\n系統會保留資料，只從菜單管理中隱藏。`);
    if (!ok) return;
    const meta = parseMeta(row.description);
    const { error } = await supabase
      .from("service_items")
      .update({
        active: false,
        description: buildDescription(meta.cleanDescription, meta.imageUrl, String(meta.sortOrder || 0), true)
      })
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
                這裡新增的項目會同步到製作報價單的下拉選單，圖片會跟著菜單項目顯示。
              </p>
            </div>
            <button onClick={createService} disabled={saving} className="primary-btn">
              {saving ? "儲存中..." : editingId ? "儲存修改" : "新增價目項目"}
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
              placeholder="排序權重，數字越小越前面"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
            <textarea
              className="form-input md:col-span-2"
              placeholder="說明備註"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <input
              className="form-input"
              placeholder="圖片網址，也可以直接上傳"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              <label className="primary-btn cursor-pointer text-center">
                {uploading ? "上傳中..." : "上傳圖片"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                />
              </label>
              {form.image_url ? (
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setForm({ ...form, image_url: "" })}
                >
                  移除圖片
                </button>
              ) : null}
              {editingId ? (
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  取消編輯
                </button>
              ) : null}
            </div>
          </div>
          {form.image_url ? (
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="菜單圖片預覽" className="max-h-72 rounded-xl object-contain" />
            </div>
          ) : null}
        </section>

        <section className="card">
          <h2 className="mb-4 text-xl font-black">目前圖片菜單</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRows.map((row) => {
              const meta = parseMeta(row.description);
              return (
                <article key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="aspect-video overflow-hidden rounded-2xl bg-neutral-100">
                    {meta.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={meta.imageUrl} alt={row.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-black text-neutral-400">
                        尚未上傳圖片
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-carcare-yellow">
                        {row.category || "未分類"} / 排序 {meta.sortOrder || 0}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-neutral-900">{row.name}</h3>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${row.active ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {row.active ? "上架" : "下架"}
                    </span>
                  </div>
                  <p className="mt-2 min-h-12 text-sm text-neutral-500">
                    {meta.cleanDescription || "沒有說明"}
                  </p>
                  <p className="mt-3 text-2xl font-black text-neutral-900">
                    ${Number(row.base_price || 0).toLocaleString()}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="secondary-btn" onClick={() => editRow(row)}>
                      編輯
                    </button>
                    <button className="secondary-btn" onClick={() => toggleActive(row)}>
                      {row.active ? "下架" : "上架"}
                    </button>
                    <button className="secondary-btn" onClick={() => softDelete(row)}>
                      刪除
                    </button>
                  </div>
                </article>
              );
            })}
            {!visibleRows.length ? (
              <div className="rounded-2xl bg-neutral-50 p-8 text-center text-neutral-500 md:col-span-2 xl:col-span-3">
                目前尚無價目項目，請先新增第一筆。
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </RequireAuth>
  );
}

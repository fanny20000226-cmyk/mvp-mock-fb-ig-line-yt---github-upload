"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import InteriorQuoteBuilder, { type QuoteDraft } from "@/components/InteriorQuoteBuilder";
import PdfExportButton from "@/components/PdfExportButton";
import PhotoZipButton from "@/components/PhotoZipButton";
import ReceiptExportButton from "@/components/ReceiptExportButton";
import { getCurrentProfile } from "@/lib/auth";
import { ensureCustomerVehicleArchive } from "@/lib/customerArchive";
import { listQuotations, listServiceItems } from "@/lib/db";
import { supabase } from "@/lib/supabase";

type QuoteRow = {
  id: string;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number;
  final_amount: number;
  status: string;
  remark: string | null;
  created_at: string;
  shop_id?: string | null;
  tax_rate?: number | null;
};

type QuoteItemRow = {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
};

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  base_price: number;
  active: boolean;
};

const statusText: Record<string, string> = {
  pending: "待客戶確認",
  confirmed: "已確認",
  converted: "已轉工單",
  void: "作廢"
};

function extractPhotoUrls(text?: string | null) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return matches.filter((url) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
}

export default function QuotationsPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, QuoteItemRow[]>>({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    plate_no: "",
    service_id: "",
    custom_item: "",
    final_amount: "",
    note: ""
  });

  const selectedService = useMemo(
    () => services.find((item) => item.id === form.service_id),
    [form.service_id, services]
  );

  async function load() {
    const [{ data: quoteData }, { data: serviceData }] = await Promise.all([
      listQuotations(),
      listServiceItems()
    ]);
    setRows((quoteData || []) as QuoteRow[]);
    setServices(((serviceData || []) as ServiceRow[]).filter((item) => item.active));
  }

  async function loadQuoteItems(quoteId: string) {
    if (quoteItems[quoteId]) return;
    const { data, error } = await supabase
      .from("quotation_items")
      .select("id, item_name, category, quantity, unit_price, subtotal")
      .eq("quotation_id", quoteId);
    if (error) return alert(error.message);
    setQuoteItems((current) => ({ ...current, [quoteId]: (data || []) as QuoteItemRow[] }));
  }

  async function toggleDetail(row: QuoteRow) {
    const nextId = expandedId === row.id ? "" : row.id;
    setExpandedId(nextId);
    if (nextId) await loadQuoteItems(row.id);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    setForm((current) => ({
      ...current,
      custom_item: current.custom_item || selectedService.name,
      final_amount: String(Number(selectedService.base_price || 0))
    }));
  }, [selectedService]);

  async function createQuotation() {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    const amount = Number(form.final_amount || selectedService?.base_price || 0);
    if (!form.customer_name || !form.plate_no) return alert("請填寫客戶姓名與車牌。");
    if (!form.custom_item && !selectedService) return alert("請選擇方案或輸入自訂項目。");

    setSaving(true);
    const itemName = form.custom_item || selectedService?.name || "自訂服務";
    const category = selectedService?.category || "其他備註";
    try {
      await ensureCustomerVehicleArchive(profile, {
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        plate_no: form.plate_no
      });
    } catch (archiveError) {
      setSaving(false);
      return alert(archiveError instanceof Error ? archiveError.message : "歸檔客戶車輛資料失敗。");
    }

    const { data, error } = await supabase
      .from("quotations")
      .insert({
        shop_id: profile.shop_id,
        created_by: profile.id,
        quote_no: `Q${Date.now()}`,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        plate_no: form.plate_no,
        total_amount: amount,
        final_amount: amount,
        status: "pending",
        remark: form.note
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return alert(error?.message || "建立報價單失敗。");
    }

    await supabase.from("quotation_items").insert({
      shop_id: profile.shop_id,
      quotation_id: data.id,
      item_name: itemName,
      category,
      quantity: 1,
      unit_price: amount,
      subtotal: amount
    });

    setForm({
      customer_name: "",
      customer_phone: "",
      plate_no: "",
      service_id: "",
      custom_item: "",
      final_amount: "",
      note: ""
    });
    setSaving(false);
    load();
  }

  async function createQuotationFromDraft(draft: QuoteDraft) {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");
    const amount = Number(draft.final_amount || 0);
    if (!draft.customer_name || !draft.plate_no) return alert("請填寫車主姓名與車牌。");

    setSaving(true);
    try {
      await ensureCustomerVehicleArchive(profile, {
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        plate_no: draft.plate_no
      });
    } catch (archiveError) {
      setSaving(false);
      return alert(archiveError instanceof Error ? archiveError.message : "歸檔客戶車輛資料失敗。");
    }

    const { data, error } = await supabase
      .from("quotations")
      .insert({
        shop_id: profile.shop_id,
        created_by: profile.id,
        quote_no: `Q${Date.now()}`,
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        plate_no: draft.plate_no,
        total_amount: amount,
        final_amount: amount,
        status: "pending",
        remark: draft.note
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return alert(error?.message || "建立報價單失敗。");
    }

    const draftItems = draft.items?.length
      ? draft.items
      : [{ id: "draft-total", label: draft.custom_item, price: amount }];

    await supabase.from("quotation_items").insert(
      draftItems.map((item) => ({
        shop_id: profile.shop_id,
        quotation_id: data.id,
        item_name: item.label,
        category: item.id.startsWith("manual") ? "手動補充" : "打翻評估",
        quantity: 1,
        unit_price: item.price,
        subtotal: item.price
      }))
    );

    setSaving(false);
    await load();
    alert("打翻評估報價單已建立。");
  }

  async function updateStatus(row: QuoteRow, status: string) {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  async function ensureCar(profileShopId: string, row: QuoteRow) {
    if (!row.plate_no) return null;
    const { data: existing } = await supabase
      .from("cars")
      .select("id")
      .eq("shop_id", profileShopId)
      .eq("plate_no", row.plate_no)
      .limit(1);
    const id = existing?.[0]?.id as string | undefined;
    if (id) return id;

    const { data, error } = await supabase
      .from("cars")
      .insert({
        shop_id: profileShopId,
        customer_name: row.customer_name || "未命名客戶",
        customer_phone: row.customer_phone || "",
        plate_no: row.plate_no,
        brand: "",
        model: "",
        updated_at: new Date().toISOString()
      })
      .select("id")
      .single();
    if (error || !data) throw error || new Error("建立車輛資料失敗");
    return data.id as string;
  }

  async function convertToOrder(row: QuoteRow) {
    if (saving) return;
    if (row.status === "converted") return alert("這張報價單已經轉成施工單。");
    const ok = window.confirm(`確定要將 ${row.quote_no} 轉成施工單嗎？`);
    if (!ok) return;

    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到門市資料，請重新登入。");

    setSaving(true);
    try {
      const carId = await ensureCar(profile.shop_id, row);
      const amount = Number(row.final_amount || row.total_amount || 0);
      const { error: orderError } = await supabase.from("construction_orders").insert({
        shop_id: profile.shop_id,
        car_id: carId,
        quotation_id: row.id,
        order_no: `W${Date.now()}`,
        status: "pending",
        total_amount: amount,
        paid_amount: 0,
        remark: `由報價單 ${row.quote_no} 轉入`,
        created_by: profile.id
      });
      if (orderError) throw orderError;

      const { error: quoteError } = await supabase
        .from("quotations")
        .update({ status: "converted" })
        .eq("id", row.id);
      if (quoteError) throw quoteError;

      await load();
      alert("已轉成施工單，可到訂單管理或施工訂單查看。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "轉施工單失敗。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <section className="space-y-5" id="quotation-pdf-area">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">製作報價單</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
            <p className="mt-1 text-sm text-neutral-500">
              手動建立現場評估報價，所有客戶資料由現場人員填寫。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={createQuotation} disabled={saving} className="primary-btn">
              {saving ? "建立中..." : "手動新增報價"}
            </button>
            <PdfExportButton targetId="quotation-pdf-area" filename="報價單.pdf" />
          </div>
        </div>

        <InteriorQuoteBuilder
          onGenerate={createQuotationFromDraft}
        />

        <div className="card grid gap-3 md:grid-cols-3">
          <div className="md:col-span-3">
            <p className="text-sm font-black text-carcare-yellow">手動補充</p>
            <h2 className="text-xl font-black">一般報價欄位</h2>
          </div>
          <input className="form-input" placeholder="客戶姓名" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className="form-input" placeholder="聯絡電話" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className="form-input" placeholder="車牌號碼" value={form.plate_no} onChange={(e) => setForm({ ...form, plate_no: e.target.value })} />
          <select className="form-input" value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value, final_amount: "", custom_item: "" })}>
            <option value="">選擇後台價目項目</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} / ${Number(service.base_price || 0).toLocaleString()}
              </option>
            ))}
          </select>
          <input className="form-input" placeholder="自訂服務名稱" value={form.custom_item} onChange={(e) => setForm({ ...form, custom_item: e.target.value })} />
          <input className="form-input" placeholder="最終報價金額" value={form.final_amount} onChange={(e) => setForm({ ...form, final_amount: e.target.value })} />
          <textarea className="form-input md:col-span-3" placeholder="備註，例如車況、客戶需求、優惠內容" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        <div className="card table-wrap">
          <h2 className="mb-4 text-xl font-black">歷史報價紀錄</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>報價單號</th>
                <th>客戶</th>
                <th>電話</th>
                <th>車牌</th>
                <th>金額</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr>
                    <td>{row.quote_no}</td>
                    <td>{row.customer_name || "-"}</td>
                    <td>{row.customer_phone || "-"}</td>
                    <td>{row.plate_no || "-"}</td>
                    <td>${Number(row.final_amount || row.total_amount || 0).toLocaleString()}</td>
                    <td>{statusText[row.status] || row.status}</td>
                    <td>
                      <div className="flex min-w-72 flex-wrap gap-2">
                        <select
                          className="form-input min-w-36"
                          value={row.status}
                          onChange={(e) => updateStatus(row, e.target.value)}
                        >
                          <option value="pending">待客戶確認</option>
                          <option value="confirmed">已確認</option>
                          <option value="converted">已轉工單</option>
                          <option value="void">作廢</option>
                        </select>
                        <button type="button" className="secondary-btn" onClick={() => toggleDetail(row)}>
                          {expandedId === row.id ? "收合明細" : "展開明細"}
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          disabled={saving || row.status === "converted"}
                          onClick={() => convertToOrder(row)}
                        >
                          轉施工單
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.id ? (
                    <tr key={`${row.id}-detail`}>
                      <td colSpan={7}>
                        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-black text-carcare-yellow">報價明細</p>
                              <h3 className="text-lg font-black text-neutral-900">{row.quote_no}</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <PhotoZipButton
                                urls={extractPhotoUrls(row.remark)}
                                filename={`PEIWAY_${row.plate_no || row.quote_no}_${String(row.created_at || new Date().toISOString()).slice(0, 10)}`}
                              />
                        <PdfExportButton targetId="quotation-pdf-area" filename={`${row.quote_no || "報價單"}.pdf`} />
                        <ReceiptExportButton
                          source={{
                            quotationId: row.id,
                            quoteNo: row.quote_no,
                            shopId: row.shop_id,
                            customerName: row.customer_name,
                            customerPhone: row.customer_phone,
                            plateNo: row.plate_no,
                            totalAmount: Number(row.final_amount || row.total_amount || 0),
                            taxRate: row.tax_rate,
                            createdAt: row.created_at
                          }}
                        />
                            </div>
                          </div>
                          <div className="table-wrap">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>項目</th>
                                  <th>分類</th>
                                  <th>數量</th>
                                  <th>單價</th>
                                  <th>小計</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(quoteItems[row.id] || []).map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.item_name}</td>
                                    <td>{item.category || "-"}</td>
                                    <td>{Number(item.quantity || 0)}</td>
                                    <td>${Number(item.unit_price || 0).toLocaleString()}</td>
                                    <td>${Number(item.subtotal || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                                {!quoteItems[row.id]?.length ? (
                                  <tr>
                                    <td colSpan={5} className="text-center text-neutral-500">
                                      目前沒有明細資料
                                    </td>
                                  </tr>
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                          {row.remark ? (
                            <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
                              <p className="mb-2 text-sm font-black text-carcare-yellow">原始報價內容</p>
                              <pre className="whitespace-pre-wrap text-sm leading-6 text-neutral-700">{row.remark}</pre>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="text-center text-neutral-500">
                    目前尚無報價單
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

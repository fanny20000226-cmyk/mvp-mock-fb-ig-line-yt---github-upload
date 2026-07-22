"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import InteriorQuoteBuilder, { type QuoteDraft } from "@/components/InteriorQuoteBuilder";
import PdfExportButton from "@/components/PdfExportButton";
import PhotoZipButton from "@/components/PhotoZipButton";
import { getCurrentProfile } from "@/lib/auth";
import { ensureCustomerVehicleArchive } from "@/lib/customerArchive";
import { supabase } from "@/lib/supabase";

type QuoteRow = {
  id: string;
  shop_id: string | null;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number | null;
  final_amount: number | null;
  status: string;
  remark: string | null;
  created_at: string;
};

type QuoteItemRow = {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
};

const statusText: Record<string, string> = {
  pending: "待確認",
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
  const [expandedId, setExpandedId] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, QuoteItemRow[]>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("quotations")
      .select("id, shop_id, quote_no, customer_name, customer_phone, plate_no, total_amount, final_amount, status, remark, created_at")
      .order("created_at", { ascending: false });
    if (error) return alert(error.message);
    setRows((data || []) as QuoteRow[]);
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

  async function createQuotationFromDraft(draft: QuoteDraft) {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到登入門市，請重新登入。");
    const amount = Number(draft.final_amount || 0);
    if (!draft.customer_name || !draft.plate_no) return alert("請填寫客戶姓名與車牌。");

    setSaving(true);
    try {
      await ensureCustomerVehicleArchive(profile, {
        customer_name: draft.customer_name,
        customer_phone: draft.customer_phone,
        plate_no: draft.plate_no
      });

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

      if (error || !data) throw error || new Error("建立報價單失敗。");

      const items = draft.items?.length
        ? draft.items
        : [{ id: "draft-total", label: draft.custom_item, price: amount }];

      const { error: itemError } = await supabase.from("quotation_items").insert(
        items.map((item) => ({
          shop_id: profile.shop_id,
          quotation_id: data.id,
          item_name: item.label,
          category: item.id.includes("carpet") ? "地毯" : item.id.includes("seat") ? "座椅" : "附加",
          quantity: 1,
          unit_price: item.price,
          subtotal: item.price
        }))
      );
      if (itemError) throw itemError;
      await load();
      alert("報價單已建立。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "建立報價單失敗。");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(row: QuoteRow, status: string) {
    const { error } = await supabase.from("quotations").update({ status }).eq("id", row.id);
    if (error) return alert(error.message);
    await load();
  }

  async function convertToOrder(row: QuoteRow) {
    if (saving) return;
    if (row.status === "converted") return alert("這張報價單已經轉為工單。");
    if (!window.confirm(`確認將 ${row.quote_no} 轉為施工工單？`)) return;

    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return alert("找不到登入門市，請重新登入。");
    setSaving(true);
    try {
      const carId = await ensureCustomerVehicleArchive(profile, {
        customer_name: row.customer_name || "未命名客戶",
        customer_phone: row.customer_phone || "",
        plate_no: row.plate_no || ""
      });
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
      alert("已轉為施工工單。");
    } catch (error) {
      alert(error instanceof Error ? error.message : "轉工單失敗。");
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.final_amount || row.total_amount || 0), 0);
    return {
      count: rows.length,
      total,
      pending: rows.filter((row) => row.status === "pending").length,
      converted: rows.filter((row) => row.status === "converted").length
    };
  }, [rows]);

  return (
    <RequireAuth>
      <section className="space-y-5" id="quotation-pdf-area">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">製作報價單</p>
            <h1 className="text-2xl font-black">打翻評估報價單</h1>
            <p className="mt-1 text-sm text-neutral-500">建立報價、匯出 PDF、轉施工工單。</p>
          </div>
          <PdfExportButton targetId="quotation-pdf-area" filename="PEIWAY_報價列表.pdf" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="card"><p className="text-sm text-neutral-500">報價單總數</p><p className="text-3xl font-black text-carcare-yellow">{summary.count}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">累計金額</p><p className="text-3xl font-black text-carcare-yellow">${summary.total.toLocaleString()}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">待客戶確認</p><p className="text-3xl font-black text-carcare-yellow">{summary.pending}</p></div>
          <div className="card"><p className="text-sm text-neutral-500">已轉工單</p><p className="text-3xl font-black text-carcare-yellow">{summary.converted}</p></div>
        </div>

        <InteriorQuoteBuilder onGenerate={createQuotationFromDraft} />

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
                        <select className="form-input min-w-36" value={row.status} onChange={(e) => updateStatus(row, e.target.value)}>
                          <option value="pending">待確認</option>
                          <option value="confirmed">已確認</option>
                          <option value="converted">已轉工單</option>
                          <option value="void">作廢</option>
                        </select>
                        <button type="button" className="secondary-btn" onClick={() => toggleDetail(row)}>
                          {expandedId === row.id ? "收合明細" : "展開明細"}
                        </button>
                        <button type="button" className="primary-btn" disabled={saving || row.status === "converted"} onClick={() => convertToOrder(row)}>
                          轉工單
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === row.id ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <PhotoZipButton
                              urls={extractPhotoUrls(row.remark)}
                              filename={`PEIWAY_${row.plate_no || row.quote_no}_${String(row.created_at).slice(0, 10)}`}
                            />
                            <PdfExportButton targetId="quotation-pdf-area" filename={`${row.quote_no || "報價單"}.pdf`} />
                          </div>
                          <table className="data-table">
                            <thead>
                              <tr><th>項目</th><th>分類</th><th>數量</th><th>單價</th><th>小計</th></tr>
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
                                <tr><td colSpan={5} className="text-center text-neutral-500">尚無明細資料</td></tr>
                              ) : null}
                            </tbody>
                          </table>
                          {row.remark ? <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-sm text-neutral-700">{row.remark}</pre> : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={7} className="text-center text-neutral-500">尚無報價資料</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </RequireAuth>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import InteriorQuoteBuilder, { type QuoteDraft } from "@/components/InteriorQuoteBuilder";
import PdfExportButton from "@/components/PdfExportButton";
import PhotoZipButton from "@/components/PhotoZipButton";
import { getCurrentProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import SyncStatusBadge, { type SyncState } from "@/components/SyncStatusBadge";
import { errorMessageZh } from "@/lib/errorMessageZh";
import type { Role } from "@/lib/permissions";
import { useUiFeedback } from "@/components/UiFeedback";
import { MoreActions, SideDrawer } from "@/components/UiPatterns";

type QuoteRow = {
  id: string;
  shop_id: string | null;
  customer_id: string | null;
  quote_no: string;
  customer_name: string | null;
  customer_phone: string | null;
  plate_no: string | null;
  total_amount: number | null;
  final_amount: number | null;
  status: string;
  remark: string | null;
  created_at: string;
  sync_status?: SyncState | null;
  last_sync_at?: string | null;
  sync_error?: string | null;
};

type QuoteItemRow = {
  id: string;
  item_name: string;
  category: string | null;
  quantity: number | null;
  unit_price: number | null;
  subtotal: number | null;
};

const quoteStages = ["draft", "pending", "confirmed", "converted", "completed", "paid"] as const;
const statusText: Record<string, string> = {
  draft: "草稿",
  pending: "待確認",
  confirmed: "已確認",
  converted: "施工中",
  in_progress: "施工中",
  completed: "已完工",
  paid: "已收款",
  void: "作廢",
};

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function extractPhotoUrls(text?: string | null) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s)]+/g) || [];
  return matches.filter((url) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
}

function itemCategory(itemId: string) {
  if (itemId.includes("carpet")) return "地毯";
  if (itemId.includes("seat")) return "座椅";
  if (itemId.includes("addon")) return "加購";
  if (itemId.includes("gift")) return "贈送";
  return "其他備註";
}

export default function QuotationsPage() {
  const { toast, confirm } = useUiFeedback();
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [expandedId, setExpandedId] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, QuoteItemRow[]>>({});
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("quotations")
      .select("id, shop_id, customer_id, quote_no, customer_name, customer_phone, plate_no, total_amount, final_amount, status, remark, created_at, sync_status, last_sync_at, sync_error")
      .order("created_at", { ascending: false });
    if (error) return toast(errorMessageZh(error, "報價紀錄讀取失敗。"), "error");
    setRows((data || []) as QuoteRow[]);
  }

  async function loadQuoteItems(quoteId: string) {
    if (quoteItems[quoteId]) return;
    const { data, error } = await supabase
      .from("quotation_items")
      .select("id, item_name, category, quantity, unit_price, subtotal")
      .eq("quotation_id", quoteId);
    if (error) return toast(errorMessageZh(error, "報價明細讀取失敗。"), "error");
    setQuoteItems((current) => ({ ...current, [quoteId]: (data || []) as QuoteItemRow[] }));
  }

  async function toggleDetail(row: QuoteRow) {
    const nextId = expandedId === row.id ? "" : row.id;
    setExpandedId(nextId);
    if (nextId) await loadQuoteItems(row.id);
  }

  useEffect(() => {
    load();
    getCurrentProfile().then((profile) => setRole(profile?.role || null));
  }, []);

  async function createQuotationFromDraft(draft: QuoteDraft) {
    if (saving) return;
    const profile = await getCurrentProfile();
    if (!profile?.shop_id) return toast("目前帳號尚未綁定門市，無法建立報價單。", "error");
    if (!draft.customer_name || !draft.plate_no) return toast("請填寫車主姓名與車牌號碼。", "error");

    const amount = Number(draft.final_amount || 0);
    setSaving(true);
    try {
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
          remark: draft.note,
        })
        .select("id")
        .single();

      if (error || !data?.id) throw error || new Error("建立報價單失敗。");

      const items = draft.items?.length
        ? draft.items
        : [{ id: "draft-total", label: draft.custom_item || "自訂項目", price: amount }];

      const { error: itemError } = await supabase.from("quotation_items").insert(
        items.map((item) => ({
          shop_id: profile.shop_id,
          quotation_id: data.id,
          item_name: item.label,
          category: itemCategory(item.id),
          quantity: 1,
          unit_price: Number(item.price || 0),
          subtotal: Number(item.price || 0),
        }))
      );
      if (itemError) throw itemError;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const archiveResponse = await fetch("/api/operations/archive-quote-car", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quoteId: data.id }),
        });
        if (!archiveResponse.ok) {
          const archiveResult = (await archiveResponse.json().catch(() => ({}))) as { message?: string };
          console.warn("報價單已建立，但客戶車輛歸檔稍後會在轉工單時重試：", archiveResult.message);
        }
      }

      await load();
      toast("報價單已建立。", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "建立報價單失敗。", "error");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(row: QuoteRow, status: string) {
    const { error } = await supabase
      .from("quotations")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast(errorMessageZh(error, "狀態更新失敗。"), "error");
    await load();
    toast(`狀態已更新為「${statusText[status] || status}」。`, "success");
  }

  async function convertToOrder(row: QuoteRow) {
    if (saving) return;
    if (["converted", "in_progress", "completed", "paid"].includes(row.status)) return toast("此報價單已轉工單，不可重複轉換", "warning");
    if (!row.customer_id) return toast("請先選擇或建立客戶", "error", { label: "前往客戶", onClick: () => { window.location.href = "/operations/customers"; } });
    if (!row.plate_no?.trim()) return toast("請先補車牌", "error", { label: "前往車輛", onClick: () => { window.location.href = "/operations/cars"; } });
    const amount = Number(row.final_amount ?? row.total_amount ?? 0);
    if (amount === 0) {
      if (role !== "admin") return toast("報價金額為 0，僅管理員可確認後轉工單。", "warning");
      if (!(await confirm({ title: "零元報價警告", message: "此報價單金額為 0，確認仍要轉工單？", confirmLabel: "確認轉換", tone: "warning" }))) return;
    }
    const { data: existingCar } = await supabase.from("cars").select("id").or(`plate_no.eq.${row.plate_no},license_plate.eq.${row.plate_no}`).limit(1).maybeSingle();
    const willCreateCar = !existingCar;
    if (!(await confirm({ title: "轉為施工單", message: `確認將 ${row.quote_no} 轉為施工單？`, confirmLabel: "確認轉換" }))) return;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("登入狀態已失效，請重新登入。");

      const response = await fetch("/api/operations/convert-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quoteId: row.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(result.message || "轉工單失敗。");

      await load();
      toast(willCreateCar ? "尚未存在該車輛，系統已自動建立車輛資料" : "已轉為施工單。", "success");
    } catch (error) {
      console.error("convert quote failed", error);
      toast(errorMessageZh(error, "轉工單失敗。"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function advanceQuote(row: QuoteRow) {
    if (saving) return;
    const normalized = row.status === "in_progress" ? "converted" : row.status;
    const index = quoteStages.indexOf(normalized as (typeof quoteStages)[number]);
    if (index < 0 || index >= quoteStages.length - 1) return;
    const next = quoteStages[index + 1];
    if (next === "converted") return convertToOrder(row);
    await updateStatus(row, next);
  }

  const summary = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + Number(row.final_amount || row.total_amount || 0), 0);
    return {
      count: rows.length,
      total,
      pending: rows.filter((row) => row.status === "pending").length,
      converted: rows.filter((row) => row.status === "converted").length,
    };
  }, [rows]);
  const expandedRow = rows.find((row) => row.id === expandedId) || null;

  return (
    <RequireAuth>
      <section className="space-y-5" id="quotation-pdf-area">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">製作報價單</p>
            <h1 className="text-2xl font-black">新建打翻評估報價單</h1>
            <p className="mt-1 text-sm text-neutral-500">建立報價、保存歷史紀錄、轉施工單與匯出 PDF。</p>
          </div>
          <PdfExportButton targetId="quotation-pdf-area" filename="PEIWAY_報價單.pdf" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="card">
            <p className="text-sm text-neutral-500">報價單總數</p>
            <p className="text-3xl font-black text-carcare-yellow">{summary.count}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">累計報價金額</p>
            <p className="text-3xl font-black text-carcare-yellow">{money(summary.total)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">待客戶確認</p>
            <p className="text-3xl font-black text-carcare-yellow">{summary.pending}</p>
          </div>
          <div className="card">
            <p className="text-sm text-neutral-500">已轉工單</p>
            <p className="text-3xl font-black text-carcare-yellow">{summary.converted}</p>
          </div>
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
                <th>狀態</th><th>同步狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.quote_no}</td>
                    <td>{row.customer_name || "-"}</td>
                    <td>{row.customer_phone || "-"}</td>
                    <td>{row.plate_no || "-"}</td>
                    <td>{money(Number(row.final_amount || row.total_amount || 0))}</td>
                    <td><div className="md:min-w-[38rem]"><div className="quote-progress">{quoteStages.map((stage, index) => { const current = Math.max(0, quoteStages.indexOf((row.status === "in_progress" ? "converted" : row.status) as (typeof quoteStages)[number])); return <span key={stage} className={`quote-progress-step ${index < current ? "is-done" : ""} ${index === current ? "is-current" : ""}`}>{statusText[stage]}</span>; })}</div></div></td>
                    <td><SyncStatusBadge table="quotations" row={row as QuoteRow & Record<string, unknown>} syncType="customer" isAdmin={role === "admin"} onChanged={load} /></td>
                    <td>
                      <div className="flex min-w-72 flex-wrap gap-2">
                        {row.status !== "paid" && row.status !== "void" ? <button type="button" className="primary-btn" disabled={saving} onClick={() => advanceQuote(row)}>{saving ? <><span className="button-spinner" />處理中</> : quoteStages[Math.min(quoteStages.indexOf((row.status === "in_progress" ? "converted" : row.status) as (typeof quoteStages)[number]) + 1, quoteStages.length - 1)] === "converted" ? "轉施工單" : `設為${statusText[quoteStages[Math.min(quoteStages.indexOf((row.status === "in_progress" ? "converted" : row.status) as (typeof quoteStages)[number]) + 1, quoteStages.length - 1)]]}`}</button> : null}
                        <MoreActions><button type="button" className="secondary-btn" onClick={() => toggleDetail(row)}>查看明細</button></MoreActions>
                      </div>
                    </td>
                  </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="text-center text-neutral-500">目前沒有報價資料。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <SideDrawer open={Boolean(expandedRow)} title={expandedRow ? `${expandedRow.quote_no} 報價明細` : "報價明細"} onClose={() => setExpandedId("")}>
            {expandedRow ? <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm"><p><span className="field-label">客戶</span>{expandedRow.customer_name || "-"}</p><p><span className="field-label">車牌</span>{expandedRow.plate_no || "-"}</p><p><span className="field-label">金額</span><strong className="text-lg">{money(Number(expandedRow.final_amount || expandedRow.total_amount || 0))}</strong></p><p><span className="field-label">狀態</span>{statusText[expandedRow.status] || expandedRow.status}</p></div>
              <div className="flex flex-wrap gap-2"><PhotoZipButton urls={extractPhotoUrls(expandedRow.remark)} filename={`PEIWAY_${expandedRow.plate_no || expandedRow.quote_no}_${String(expandedRow.created_at).slice(0, 10)}`} /><PdfExportButton targetId="quotation-pdf-area" filename={`${expandedRow.quote_no}.pdf`} /></div>
              <div className="space-y-2">{(quoteItems[expandedRow.id] || []).map((item) => <article key={item.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex justify-between gap-3"><strong>{item.item_name}</strong><strong>{money(Number(item.subtotal || 0))}</strong></div><p className="mt-1 text-xs text-neutral-500">{item.category || "未分類"}・{Number(item.quantity || 0)} × {money(Number(item.unit_price || 0))}</p></article>)}</div>
              {expandedRow.remark ? <details><summary className="secondary-btn cursor-pointer">展開備註</summary><pre className="mt-2 whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm">{expandedRow.remark}</pre></details> : null}
            </div> : null}
          </SideDrawer>
        </div>
      </section>
    </RequireAuth>
  );
}

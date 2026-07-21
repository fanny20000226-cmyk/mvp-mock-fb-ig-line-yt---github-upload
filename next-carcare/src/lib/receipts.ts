"use client";

import { getCurrentProfile } from "./auth";
import { supabase } from "./supabase";
import type { Role } from "./permissions";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReceiptSource = {
  quotationId?: string | null;
  quoteNo?: string | null;
  orderNo?: string | null;
  shopId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  plateNo?: string | null;
  totalAmount: number;
  taxRate?: number | null;
  createdAt?: string | null;
};

export type TaxBreakdown = {
  taxRate: number;
  amountBeforeTax: number;
  taxAmount: number;
  totalAmount: number;
};

export const defaultTaxRate = 0.05;

export function canManageReceipts(role: Role) {
  return ["admin", "finance", "shop_manager", "vice_manager"].includes(role);
}

export function canExportSingleReceipt(role: Role) {
  return ["admin", "finance", "shop_manager", "vice_manager", "worker"].includes(role);
}

export function calculateTax(totalAmount: number, taxRate = defaultTaxRate): TaxBreakdown {
  const total = Math.max(Number(totalAmount || 0), 0);
  const rate = Math.max(Number(taxRate || 0), 0);
  const amountBeforeTax = rate > 0 ? Math.round((total / (1 + rate)) * 100) / 100 : total;
  const taxAmount = Math.round((total - amountBeforeTax) * 100) / 100;
  return {
    taxRate: rate,
    amountBeforeTax,
    taxAmount,
    totalAmount: total
  };
}

export function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

export async function listReceiptItems(quotationId?: string | null, fallback?: ReceiptItem[]) {
  if (!quotationId) return fallback || [];
  const { data, error } = await supabase
    .from("quotation_items")
    .select("item_name, quantity, unit_price, subtotal")
    .eq("quotation_id", quotationId);
  if (error) return fallback || [];
  const items = (data || []).map((item) => ({
    name: String(item.item_name || "施工項目"),
    quantity: Number(item.quantity || 1),
    unitPrice: Number(item.unit_price || 0),
    subtotal: Number(item.subtotal || 0)
  }));
  return items.length ? items : fallback || [];
}

export async function recordReceiptPrint(source: ReceiptSource, breakdown: TaxBreakdown) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("請重新登入後再開立收據。");
  const storeId = source.shopId || profile.shop_id;

  const { error: insertError } = await supabase.from("receipt_records").insert({
    quotation_id: source.quotationId || null,
    store_id: storeId,
    tax_rate: breakdown.taxRate,
    total_tax: breakdown.taxAmount,
    amount_before_tax: breakdown.amountBeforeTax,
    total_amount: breakdown.totalAmount,
    print_user_id: profile.id,
    customer_name: source.customerName || "",
    plate_no: source.plateNo || "",
    receipt_no: `R${Date.now()}`
  });
  if (insertError) throw insertError;

  if (source.quotationId) {
    const { data } = await supabase
      .from("quotations")
      .select("receipt_print_count")
      .eq("id", source.quotationId)
      .single();
    const nextCount = Number((data as { receipt_print_count?: number } | null)?.receipt_print_count || 0) + 1;
    await supabase
      .from("quotations")
      .update({
        tax_rate: breakdown.taxRate,
        tax_amount: breakdown.taxAmount,
        amount_before_tax: breakdown.amountBeforeTax,
        receipt_print_count: nextCount
      })
      .eq("id", source.quotationId);
  }
}

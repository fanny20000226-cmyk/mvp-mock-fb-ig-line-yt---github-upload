import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/permissions";

export type CustomerTag = {
  id: string;
  customer_id: string;
  shop_id: string | null;
  tag_name: string;
  tag_color: string;
};

export const defaultCustomerTags = [
  { tag_name: "寵物車", tag_color: "#ffc107" },
  { tag_name: "異味嚴重", tag_color: "#ef4444" },
  { tag_name: "VIP客戶", tag_color: "#22c55e" },
  { tag_name: "敏感內裝", tag_color: "#8b5cf6" },
  { tag_name: "長期寄存車輛", tag_color: "#0ea5e9" },
  { tag_name: "折扣專屬", tag_color: "#f97316" }
];

export function normalizeCustomerKey(name?: string | null, phone?: string | null, fallback?: string | null) {
  return String(phone || name || fallback || "")
    .trim()
    .toLowerCase();
}

export function canManageCustomerTags(role?: Role | null) {
  return role === "admin" || role === "shop_manager" || role === "vice_manager";
}

export function canAttachCustomerTags(role?: Role | null) {
  return role !== "worker";
}

export async function listCustomerTags() {
  return supabase.from("customer_tags").select("id, customer_id, shop_id, tag_name, tag_color").order("tag_name");
}

export async function addCustomerTag(input: {
  customerId: string;
  shopId: string | null;
  tagName: string;
  tagColor: string;
  createdBy?: string;
}) {
  return supabase.from("customer_tags").upsert(
    {
      customer_id: input.customerId,
      shop_id: input.shopId,
      tag_name: input.tagName.trim(),
      tag_color: input.tagColor || "#ffc107",
      created_by: input.createdBy || null
    },
    { onConflict: "shop_id,customer_id,tag_name" }
  );
}

export async function removeCustomerTag(id: string) {
  return supabase.from("customer_tags").delete().eq("id", id);
}

export async function removeTagEverywhere(tagName: string, shopId: string | null) {
  let query = supabase.from("customer_tags").delete().eq("tag_name", tagName);
  if (shopId) query = query.eq("shop_id", shopId);
  return query;
}

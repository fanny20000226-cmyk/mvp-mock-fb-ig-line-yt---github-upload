import { supabase } from "@/lib/supabase";
import type { Role } from "@/lib/permissions";

export type ReservationConflict = {
  id: string;
  order_no: string | null;
  reserve_start: string | null;
  reserve_end: string | null;
  start_at: string | null;
  remark: string | null;
  cars?: {
    customer_name?: string | null;
    plate_no?: string | null;
    brand?: string | null;
    model?: string | null;
  } | null;
  quotations?: {
    quote_no?: string | null;
    remark?: string | null;
  } | null;
};

type RelationValue<T> = T | T[] | null | undefined;

type ReservationConflictRelation = {
  customer_name?: string | null;
  plate_no?: string | null;
  brand?: string | null;
  model?: string | null;
};

type QuotationConflictRelation = {
  quote_no?: string | null;
  remark?: string | null;
};

type ReservationConflictQueryRow = Omit<ReservationConflict, "cars" | "quotations"> & {
  cars?: RelationValue<ReservationConflictRelation>;
  quotations?: RelationValue<QuotationConflictRelation>;
};

function firstRelation<T>(value: RelationValue<T>) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function normalizeReservationConflict(row: ReservationConflictQueryRow): ReservationConflict {
  return {
    ...row,
    cars: firstRelation(row.cars),
    quotations: firstRelation(row.quotations)
  };
}

export function canOverrideReservationConflict(role?: Role | null) {
  return role === "admin" || role === "shop_manager" || role === "vice_manager";
}

export function parseReservationStart(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(/\//g, "-").replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function defaultReserveEnd(start: Date) {
  const end = new Date(start);
  end.setHours(end.getHours() + 2);
  return end;
}

export async function findReservationConflicts(input: {
  storeId: string | null;
  start: Date;
  end?: Date;
  excludeId?: string;
}) {
  if (!input.storeId) return { data: [] as ReservationConflict[], error: null };
  const end = input.end || defaultReserveEnd(input.start);
  let query = supabase
    .from("construction_orders")
    .select(
      `
      id,
      order_no,
      reserve_start,
      reserve_end,
      start_at,
      remark,
      cars(customer_name, plate_no, brand, model),
      quotations(quote_no, remark)
    `
    )
    .eq("store_id", input.storeId)
    .lt("reserve_start", end.toISOString())
    .gt("reserve_end", input.start.toISOString())
    .neq("status", "cancelled");

  if (input.excludeId) query = query.neq("id", input.excludeId);
  const { data, error } = await query;
  return {
    data: error ? null : ((data || []) as ReservationConflictQueryRow[]).map(normalizeReservationConflict),
    error
  };
}

export function formatReservationConflict(conflicts: ReservationConflict[]) {
  return conflicts
    .map((item) => {
      const start = item.reserve_start || item.start_at || "";
      const end = item.reserve_end || "";
      const customer = item.cars?.customer_name || "未填車主";
      const plate = item.cars?.plate_no || "未填車牌";
      const service = item.quotations?.quote_no || item.order_no || "施工單";
      return `${customer} / ${plate} / ${service} / ${start.slice(0, 16).replace("T", " ")}-${end.slice(11, 16)}`;
    })
    .join("\n");
}

export function buildConflictNote(conflicts: ReservationConflict[]) {
  return `[預約衝突強制建立]\n${formatReservationConflict(conflicts)}`;
}

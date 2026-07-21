"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { getCurrentProfile } from "@/lib/auth";
import { listCustomerTags, normalizeCustomerKey, type CustomerTag } from "@/lib/customerTags";
import {
  buildConflictNote,
  canOverrideReservationConflict,
  defaultReserveEnd,
  findReservationConflicts,
  formatReservationConflict,
  parseReservationStart
} from "@/lib/reservationConflicts";
import { supabase } from "@/lib/supabase";

type ScheduleRow = {
  id: string;
  order_no: string;
  status: string;
  store_id: string | null;
  start_at: string | null;
  reserve_start: string | null;
  reserve_end: string | null;
  finish_at: string | null;
  conflict_override?: boolean | null;
  conflict_note?: string | null;
  remark: string | null;
  cars?: {
    customer_name?: string | null;
    customer_phone?: string | null;
    plate_no?: string | null;
    brand?: string | null;
    model?: string | null;
  } | null;
  quotations?: {
    quote_no?: string | null;
    remark?: string | null;
  } | null;
};

const statusText: Record<string, string> = {
  pending: "待施工",
  scheduled: "已排程",
  working: "施工中",
  finished: "已完工",
  picked_up: "已牽車",
  cancelled: "取消"
};

function dayKey(value?: string | null) {
  return value ? String(value).slice(0, 10) : "未排程";
}

function timeText(value?: string | null) {
  if (!value) return "未排程";
  return String(value).slice(0, 16).replace("T", " ");
}

export default function CalendarPage() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [store, setStore] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [view, setView] = useState<"day" | "week">("day");
  const [tags, setTags] = useState<CustomerTag[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("construction_orders")
      .select(`
        id,
        order_no,
        status,
        store_id,
        start_at,
        reserve_start,
        reserve_end,
        finish_at,
        conflict_override,
        conflict_note,
        remark,
        cars(customer_name, customer_phone, plate_no, brand, model),
        quotations(quote_no, remark)
      `)
      .order("start_at", { ascending: true });
    if (error) return alert(error.message);
    setRows((data || []) as ScheduleRow[]);
    const tagRows = await listCustomerTags();
    if (!tagRows.error) setTags((tagRows.data || []) as CustomerTag[]);
  }

  useEffect(() => {
    load();
  }, []);

  const visibleRows = useMemo(() => {
    const base = rows.filter((row) => {
      const haystack = `${row.remark || ""} ${row.quotations?.remark || ""}`;
      return !store || haystack.includes(store);
    });
    if (view === "day") return base.filter((row) => dayKey(row.start_at) === date);
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return base.filter((row) => {
      if (!row.start_at) return false;
      const current = new Date(row.start_at);
      return current >= start && current < end;
    });
  }, [date, rows, store, view]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, ScheduleRow[]>();
    visibleRows.forEach((row) => {
      const key = dayKey(row.start_at);
      groups.set(key, [...(groups.get(key) || []), row]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleRows]);

  const tagsByCustomer = useMemo(() => {
    const grouped = new Map<string, CustomerTag[]>();
    tags.forEach((tag) => grouped.set(tag.customer_id, [...(grouped.get(tag.customer_id) || []), tag]));
    return grouped;
  }, [tags]);

  function tagsForRow(row: ScheduleRow) {
    const key = normalizeCustomerKey(row.cars?.customer_name, row.cars?.customer_phone, row.cars?.plate_no);
    return tagsByCustomer.get(key) || [];
  }

  async function updateStatus(row: ScheduleRow, status: string) {
    const patch: Record<string, string | null> = { status };
    if (status === "working" && !row.start_at) patch.start_at = new Date().toISOString();
    if (status === "finished" && !row.finish_at) patch.finish_at = new Date().toISOString();
    const { error } = await supabase.from("construction_orders").update(patch).eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  async function reschedule(row: ScheduleRow) {
    const next = window.prompt("請輸入新的預約日期時間，例如 2026-07-21T10:30", row.start_at || `${date}T10:00`);
    if (!next) return;
    const remark = [
      row.remark || "",
      `[改期紀錄] ${new Date().toLocaleString("zh-TW")}：${row.start_at || "未排程"} -> ${next}`
    ]
      .filter(Boolean)
      .join("\n");
    const { error } = await supabase
      .from("construction_orders")
      .update({ start_at: next, status: "scheduled", remark })
      .eq("id", row.id);
    if (error) return alert(error.message);
    load();
  }

  async function rescheduleWithConflict(row: ScheduleRow) {
    const next = window.prompt("請輸入新的預約日期時間，例如 2026-07-21T10:30", row.start_at || `${date}T10:00`);
    if (!next) return;
    const profile = await getCurrentProfile();
    const reserveStart = parseReservationStart(next);
    const reserveEnd = reserveStart ? defaultReserveEnd(reserveStart) : null;
    let conflictOverride = row.conflict_override || false;
    let conflictNote = row.conflict_note || "";

    if (reserveStart && reserveEnd) {
      const { data: conflicts, error: conflictError } = await findReservationConflicts({
        storeId: row.store_id || profile?.shop_id || null,
        start: reserveStart,
        end: reserveEnd,
        excludeId: row.id
      });
      if (conflictError) return alert(conflictError.message);
      if (conflicts?.length) {
        const message = `同門市同時段已有預約：\n${formatReservationConflict(conflicts)}`;
        if (!canOverrideReservationConflict(profile?.role)) {
          alert(`${message}\n\n請調整預約時間。`);
          return;
        }
        const ok = window.confirm(`${message}\n\n是否強制改期建立重疊預約？`);
        if (!ok) return;
        conflictOverride = true;
        conflictNote = buildConflictNote(conflicts);
      }
    }

    const remark = [
      row.remark || "",
      `[改期紀錄] ${new Date().toLocaleString("zh-TW")}：${row.start_at || "未排程"} -> ${next}`,
      conflictNote
    ]
      .filter(Boolean)
      .join("\n");
    const { error } = await supabase
      .from("construction_orders")
      .update({
        start_at: reserveStart ? reserveStart.toISOString() : next,
        reserve_start: reserveStart ? reserveStart.toISOString() : next,
        reserve_end: reserveEnd ? reserveEnd.toISOString() : null,
        status: "scheduled",
        remark,
        conflict_override: conflictOverride,
        conflict_note: conflictNote || null
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
              <p className="text-sm font-black text-carcare-yellow">多門市排程</p>
              <h1 className="text-2xl font-black">預約行事曆</h1>
              <p className="mt-1 text-sm text-neutral-500">
                依門市與日期查看待施工、施工中、已完工與已牽車狀態。
              </p>
            </div>
            <Link href="/operations/paste-reservation" className="primary-btn">
              新增現場預約
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <select className="form-input" value={store} onChange={(event) => setStore(event.target.value)}>
              <option value="">全部門市</option>
              <option>三重</option>
              <option>桃園</option>
              <option>新竹</option>
              <option>台南</option>
              <option>台北</option>
              <option>台中</option>
              <option>高雄</option>
            </select>
            <input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <select className="form-input" value={view} onChange={(event) => setView(event.target.value as "day" | "week")}>
              <option value="day">日檢視</option>
              <option value="week">週檢視</option>
            </select>
            <button className="secondary-btn" onClick={load} type="button">
              重新整理
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {["pending", "scheduled", "working", "finished"].map((status) => (
            <div key={status} className="card">
              <p className="text-sm font-black text-neutral-500">{statusText[status]}</p>
              <p className="mt-2 text-3xl font-black text-carcare-yellow">
                {visibleRows.filter((row) => row.status === status).length}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          {groupedRows.map(([day, items]) => (
            <div key={day} className="card">
              <h2 className="mb-4 text-xl font-black">{day}</h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {items.map((row) => {
                  const rowTags = tagsForRow(row);
                  const hasConflict = Boolean(row.conflict_override || row.conflict_note);
                  return (
                  <article
                    key={row.id}
                    title={row.conflict_note || undefined}
                    className={`rounded-2xl border bg-white p-4 shadow-sm ${
                      hasConflict ? "border-carcare-yellow ring-2 ring-carcare-yellow/40" : "border-neutral-200"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-black text-neutral-900">{timeText(row.start_at)} / {row.order_no}</p>
                        <p className="mt-1 text-sm text-neutral-500">
                          {row.cars?.customer_name || "未填車主"} / {row.cars?.plate_no || "未填車牌"}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {[row.cars?.brand, row.cars?.model].filter(Boolean).join(" ") || "未填車型"}
                        </p>
                      </div>
                      <span className="rounded-full bg-carcare-yellow px-3 py-1 text-xs font-black text-carcare-black">
                        {statusText[row.status] || row.status}
                      </span>
                    </div>
                    {hasConflict ? (
                      <p className="mt-3 rounded-xl bg-carcare-yellow/20 px-3 py-2 text-xs font-black text-carcare-black">
                        時段衝突：滑鼠停留可查看重疊預約資訊
                      </p>
                    ) : null}
                    {rowTags.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {rowTags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-3 py-1 text-xs font-black text-carcare-black"
                            style={{ backgroundColor: tag.tag_color || "#ffc107" }}
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="secondary-btn" type="button" onClick={() => rescheduleWithConflict(row)}>
                        改期
                      </button>
                      <button className="secondary-btn" type="button" onClick={() => updateStatus(row, "working")}>
                        施工中
                      </button>
                      <button className="secondary-btn" type="button" onClick={() => updateStatus(row, "finished")}>
                        已完工
                      </button>
                      <button className="secondary-btn" type="button" onClick={() => updateStatus(row, "picked_up")}>
                        已牽車
                      </button>
                    </div>
                  </article>
                );
                })}
              </div>
            </div>
          ))}
          {!groupedRows.length ? (
            <div className="card text-center text-neutral-500">目前沒有符合條件的排程。</div>
          ) : null}
        </section>
      </div>
    </RequireAuth>
  );
}

import { NextResponse } from "next/server";
import { sendSheetSyncToN8n, type SheetSyncInput, type SheetSyncKind } from "@/lib/n8nIntegration";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type InsertResult = {
  table: string;
  data: Record<string, unknown>;
};

type SampleResult = {
  inserted: InsertResult;
  sync: SheetSyncInput;
};

const FALLBACK_TEST_STORE_ID = "00000000-0000-0000-0000-000000000001";

function nowIso() {
  return new Date().toISOString();
}

async function resolveTestShopId() {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("shops")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return String(data?.id || FALLBACK_TEST_STORE_ID);
}

async function insertFirstWorking(table: string, attempts: Record<string, unknown>[]): Promise<InsertResult> {
  const admin = getSupabaseAdmin();
  let lastError: unknown = null;

  for (const payload of attempts) {
    const { data, error } = await admin.from(table).insert(payload).select("*").single();
    if (!error && data?.id) return { table, data: data as Record<string, unknown> };
    lastError = error;
  }

  const message = lastError instanceof Error ? lastError.message : JSON.stringify(lastError);
  throw new Error(message || `Failed to insert ${table}`);
}

async function cleanup(table: string, id: unknown) {
  if (!id) return { ok: false, message: "Missing id for cleanup." };
  const admin = getSupabaseAdmin();
  const { error } = await admin.from(table).delete().eq("id", id);
  return { ok: !error, message: error?.message || "" };
}

async function createCustomerSample(): Promise<SampleResult> {
  const stamp = Date.now();
  const shopId = await resolveTestShopId();
  const plate = `SYNC-${String(stamp).slice(-6)}`;
  const sample = {
    name: `N8N即時同步測試客戶${String(stamp).slice(-4)}`,
    phone: `09${String(stamp).slice(-8)}`,
    store_id: shopId,
    source_channel: "system-realtime-test",
    created_at: nowIso(),
    updated_at: nowIso()
  };
  const inserted = await insertFirstWorking("customers", [
    sample,
    { name: sample.name, phone: sample.phone, shop_id: shopId },
    { name: sample.name, phone: sample.phone }
  ]);

  return {
    inserted,
    sync: {
      sync_type: "customer",
      source_table: "customers",
      operation: "test",
      unique_key: String(inserted.data.id),
      store_id: String(inserted.data.store_id || inserted.data.shop_id || shopId),
      plate,
      model: "5人座轎車",
      is_test: true,
      record: {
        ...inserted.data,
        display_name: sample.name,
        customer_phone: sample.phone,
        license_plate: plate,
        car_model: "5人座轎車",
        car_year: 2026,
        source_channel: "system-realtime-test"
      }
    }
  };
}

async function createFinanceSample(): Promise<SampleResult> {
  const stamp = Date.now();
  const shopId = await resolveTestShopId();
  const sample = {
    store_id: shopId,
    quotation_id: null,
    pay_amount: 1680,
    pay_method: "system-realtime-test",
    pay_time: nowIso(),
    created_at: nowIso(),
    updated_at: nowIso()
  };

  const inserted = await insertFirstWorking("transaction_record", [
    sample,
    {
      store_id: sample.store_id,
      pay_amount: sample.pay_amount,
      pay_method: sample.pay_method,
      pay_time: sample.pay_time
    }
  ]);

  return {
    inserted,
    sync: {
      sync_type: "finance",
      source_table: "transaction_record",
      operation: "test",
      unique_key: String(inserted.data.id),
      store_id: String(inserted.data.store_id || shopId),
      is_test: true,
      record: {
        ...inserted.data,
        pay_amount: inserted.data.pay_amount || sample.pay_amount,
        pay_time: inserted.data.pay_time || sample.pay_time,
        pay_method: inserted.data.pay_method || sample.pay_method,
        payment_type: "測試收款",
        note: "N8N realtime sync test"
      }
    }
  };
}

export async function POST(request: Request) {
  let inserted: InsertResult | null = null;
  try {
    const body = await request.json();
    const type: SheetSyncKind = body.type === "finance" ? "finance" : "customer";
    const shouldCleanup = body.cleanup === true;
    const sample = type === "finance" ? await createFinanceSample() : await createCustomerSample();
    inserted = sample.inserted;
    const n8n = await sendSheetSyncToN8n(sample.sync);
    const cleanupResult = shouldCleanup ? await cleanup(inserted.table, inserted.data.id) : null;

    return NextResponse.json({
      ok: Boolean(n8n.ok),
      type,
      table: inserted.table,
      record_id: inserted.data.id,
      n8n,
      cleanup: cleanupResult,
      retained_for_n8n: !shouldCleanup,
      note: shouldCleanup
        ? "測試資料已清除。若 N8N 是非同步完整同步，可能讀不到本筆測試資料。"
        : "測試資料已保留，N8N 的報表 View 可以讀到本筆資料並寫入 Google Sheets。"
    });
  } catch (error) {
    const cleanupResult = inserted ? await cleanup(inserted.table, inserted.data.id) : null;
    const message = error instanceof Error ? error.message : "Realtime sync test failed";
    return NextResponse.json({ ok: false, message, cleanup: cleanupResult }, { status: 500 });
  }
}

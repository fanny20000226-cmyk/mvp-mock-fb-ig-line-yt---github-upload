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
    shop_id: shopId,
    store_id: shopId,
    payment_no: `SYNC-P${stamp}`,
    pay_type: "測試收款",
    amount: 1680,
    pay_amount: 1680,
    pay_method: "system-realtime-test",
    paid_at: nowIso(),
    pay_time: nowIso(),
    check_status: "test",
    remark: "N8N realtime sync test, safe to delete."
  };

  const inserted = await insertFirstWorking("payment", [
    sample,
    {
      shop_id: sample.shop_id,
      payment_no: sample.payment_no,
      pay_type: sample.pay_type,
      amount: sample.amount,
      paid_at: sample.paid_at,
      check_status: sample.check_status,
      remark: sample.remark
    },
    {
      shop_id: sample.shop_id,
      payment_no: sample.payment_no,
      pay_type: sample.pay_type,
      amount: sample.amount,
      check_status: sample.check_status,
      remark: sample.remark
    }
  ]);

  return {
    inserted,
    sync: {
      sync_type: "finance",
      source_table: "payment",
      operation: "test",
      unique_key: String(inserted.data.id),
      store_id: String(inserted.data.store_id || inserted.data.shop_id || shopId),
      is_test: true,
      record: {
        ...inserted.data,
        payment_no: sample.payment_no,
        pay_amount: inserted.data.pay_amount || inserted.data.amount || sample.amount,
        pay_time: inserted.data.pay_time || inserted.data.paid_at || sample.paid_at,
        pay_method: inserted.data.pay_method || sample.pay_method,
        payment_type: inserted.data.pay_type || sample.pay_type,
        note: inserted.data.remark || sample.remark
      }
    }
  };
}

export async function POST(request: Request) {
  let inserted: InsertResult | null = null;
  try {
    const body = await request.json();
    const type: SheetSyncKind = body.type === "finance" ? "finance" : "customer";
    const sample = type === "finance" ? await createFinanceSample() : await createCustomerSample();
    inserted = sample.inserted;
    const n8n = await sendSheetSyncToN8n(sample.sync);
    const cleanupResult = await cleanup(inserted.table, inserted.data.id);

    return NextResponse.json({
      ok: Boolean(n8n.ok),
      type,
      table: inserted.table,
      record_id: inserted.data.id,
      n8n,
      cleanup: cleanupResult
    });
  } catch (error) {
    const cleanupResult = inserted ? await cleanup(inserted.table, inserted.data.id) : null;
    const message = error instanceof Error ? error.message : "Realtime sync test failed";
    return NextResponse.json({ ok: false, message, cleanup: cleanupResult }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError, requireServerProfile } from "@/lib/serverAuth";

export async function GET(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, ["admin", "shop_manager"]);
    const admin = getSupabaseAdmin();
    const tenantId = profile.tenant_id;
    const [settings, audits, backups, restores, shops] = await Promise.all([
      admin.from("system_settings").select("*").eq("tenant_id", tenantId).order("category"),
      admin.from("audit_logs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(200),
      admin.from("backup_jobs").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(50),
      admin.from("restore_requests").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(30),
      admin.from("shops").select("id,name,active,tenant_id").eq("tenant_id", tenantId).order("name")
    ]);
    if (settings.error) throw settings.error;
    const inScope = <T extends { shop_id?: string | null }>(rows: T[] | null) => profile.role === "admin" ? rows || [] : (rows || []).filter((x) => !x.shop_id || x.shop_id === profile.shop_id);
    return NextResponse.json({
      settings: inScope(settings.data), audits: inScope(audits.data), backups: inScope(backups.data), restores: inScope(restores.data),
      shops: profile.role === "admin" ? shops.data || [] : (shops.data || []).filter((x) => x.id === profile.shop_id)
    });
  } catch (error) { const e = apiError(error); return NextResponse.json({ message: e.message }, { status: e.status }); }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireServerProfile(request, ["admin", "shop_manager"]);
    const body = await request.json(); const admin = getSupabaseAdmin();
    if (body.action === "save_setting") {
      const payload = { tenant_id: profile.tenant_id, shop_id: profile.role === "admin" ? body.shop_id || null : profile.shop_id, category: String(body.category), setting_key: String(body.setting_key), label: String(body.label), value: body.value ?? {}, description: body.description || null, updated_by: profile.id, updated_at: new Date().toISOString() };
      let existingQuery = admin.from("system_settings").select("id").eq("tenant_id", profile.tenant_id).eq("category", payload.category).eq("setting_key", payload.setting_key);
      existingQuery = payload.shop_id ? existingQuery.eq("shop_id", payload.shop_id) : existingQuery.is("shop_id", null);
      const { data: existing } = await existingQuery.maybeSingle();
      const result = existing?.id
        ? await admin.from("system_settings").update(payload).eq("id", existing.id).select().single()
        : await admin.from("system_settings").insert(payload).select().single();
      const { data, error } = result;
      if (error) throw error; return NextResponse.json(data);
    }
    if (body.action === "queue_backup") {
      if (profile.role !== "admin") return NextResponse.json({ message: "只有總管理員可以建立備份工作。" }, { status: 403 });
      const { data, error } = await admin.from("backup_jobs").insert({ tenant_id: profile.tenant_id, shop_id: body.shop_id || null, backup_type: body.backup_type || "full", retention_days: Number(body.retention_days) || 30, requested_by: profile.id }).select().single();
      if (error) throw error; return NextResponse.json(data);
    }
    if (body.action === "request_restore") {
      if (profile.role !== "admin") return NextResponse.json({ message: "只有總管理員可以申請還原。" }, { status: 403 });
      const { data, error } = await admin.from("restore_requests").insert({ backup_job_id: body.backup_job_id, tenant_id: profile.tenant_id, shop_id: body.shop_id || null, scope: body.scope || "full", reason: String(body.reason || ""), requested_by: profile.id }).select().single();
      if (error) throw error; return NextResponse.json(data);
    }
    return NextResponse.json({ message: "不支援的操作。" }, { status: 400 });
  } catch (error) { const e = apiError(error); return NextResponse.json({ message: e.message }, { status: e.status }); }
}

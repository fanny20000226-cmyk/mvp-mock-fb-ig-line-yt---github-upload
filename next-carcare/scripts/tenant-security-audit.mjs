import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const enterpriseSql = await readFile(new URL("supabase-step19-enterprise-foundation.sql", root), "utf8");
const storageSql = await readFile(new URL("supabase-storage.sql", root), "utf8");
const requiredSignals = [
  [enterpriseSql, /enable row level security/i, "RLS enablement"],
  [enterpriseSql, /tenant_shop_isolation/i, "tenant/shop restrictive policy"],
  [enterpriseSql, /current_profile\(\)/i, "authenticated profile scope"],
  [enterpriseSql, /revoke insert,update,delete on public\.audit_logs/i, "immutable audit log"],
  [storageSql, /car_images_select/i, "Storage select policy"],
  [storageSql, /car_images_insert/i, "Storage insert policy"],
  [storageSql, /car_images_update/i, "Storage update policy"],
  [storageSql, /car_images_delete/i, "Storage delete policy"],
];

const missing = requiredSignals.filter(([text, pattern]) => !pattern.test(text)).map(([, , label]) => label);
if (missing.length) throw new Error(`Tenant security audit missing: ${missing.join(", ")}`);
console.log(`Tenant security audit passed: ${requiredSignals.length} policy signals checked.`);

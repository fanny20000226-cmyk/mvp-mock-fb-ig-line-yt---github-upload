import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qhbdjeiieeiynuvlrltp.supabase.co";

const readOnlyKey =
  process.env.SUPABASE_MAINTENANCE_READONLY_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getMaintenanceReadOnlyClient() {
  if (!readOnlyKey) {
    throw new Error("Missing SUPABASE_MAINTENANCE_READONLY_KEY, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient(supabaseUrl, readOnlyKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

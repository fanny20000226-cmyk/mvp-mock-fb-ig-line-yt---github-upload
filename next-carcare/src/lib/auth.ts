"use client";

import { supabase } from "./supabase";
import type { UserProfile } from "./permissions";

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, shop_id, account, name, role, active")
    .eq("id", authData.user.id)
    .eq("active", true)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function signOut() {
  await supabase.auth.signOut();
  document.cookie = "carcare-session=; path=/; max-age=0; SameSite=Lax";
}

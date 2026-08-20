"use client";

import { supabase } from "@/lib/supabase";

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data.session?.access_token;
  if (!token) throw new Error("登入狀態已失效，請重新登入。");

  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return fetch(input, { ...init, headers });
}

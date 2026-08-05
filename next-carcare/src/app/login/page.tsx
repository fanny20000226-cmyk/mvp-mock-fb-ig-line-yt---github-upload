"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function login() {
    setErrorMessage("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);

    if (error) {
      setErrorMessage("登入失敗，請確認信箱、密碼，或先建立第一個管理員帳號。");
      return;
    }

    document.cookie = "carcare-session=1; path=/; max-age=604800; SameSite=Lax";
    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-carcare-black p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8">
          <p className="text-sm font-black text-carcare-yellow">CarCare System</p>
          <h1 className="mt-2 text-3xl font-black text-carcare-black">
            門店管理後台
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            請使用管理員信箱與密碼登入系統。
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!loading) void login();
          }}
        >
          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-black">信箱</span>
            <input
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-2 block text-sm font-black">密碼</span>
            <input
              className="form-input"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? (
            <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-neutral-800">
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className="primary-btn w-full">
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <Link
          href="/setup-admin"
          className="mt-5 block text-center text-sm font-bold text-neutral-500 transition hover:text-carcare-yellow"
        >
          首次建立管理員帳號
        </Link>
      </section>
    </main>
  );
}

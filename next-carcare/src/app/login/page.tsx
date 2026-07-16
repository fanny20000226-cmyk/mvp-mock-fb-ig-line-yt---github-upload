"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);

    if (error) {
      alert("登入失敗，請確認帳號或密碼。");
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
            登入管理後台
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            請使用管理員或員工帳號登入。
          </p>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-sm font-black">Email</span>
          <input
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
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
          />
        </label>

        <button onClick={login} disabled={loading} className="primary-btn w-full">
          {loading ? "登入中..." : "登入"}
        </button>
      </section>
    </main>
  );
}

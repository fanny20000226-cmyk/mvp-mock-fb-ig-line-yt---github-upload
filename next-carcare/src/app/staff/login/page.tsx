"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffLogin } from "@/lib/staff";

export default function StaffLoginPage() {
  const router = useRouter();
  const [employeeNo, setEmployeeNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await staffLogin(employeeNo.trim(), password);
      router.push("/staff/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-carcare-bg p-4">
      <section className="mx-auto flex min-h-[calc(100vh-32px)] max-w-md items-center">
        <form onSubmit={handleSubmit} className="card w-full">
          <div className="rounded-2xl bg-carcare-black p-5 text-white">
            <p className="text-sm font-black text-carcare-yellow">PEIWAY Staff</p>
            <h1 className="mt-2 text-2xl font-black">員工個人後台登入</h1>
            <p className="mt-2 text-sm text-white/70">
              使用人資建立的員工編號與專屬密碼登入。
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <input
              className="form-input"
              value={employeeNo}
              onChange={(event) => setEmployeeNo(event.target.value)}
              placeholder="員工編號"
              autoComplete="username"
            />
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="員工密碼"
              autoComplete="current-password"
            />
            {error ? <p className="text-sm font-black text-red-600">{error}</p> : null}
            <button type="submit" className="primary-btn w-full" disabled={loading}>
              {loading ? "登入中..." : "登入員工後台"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

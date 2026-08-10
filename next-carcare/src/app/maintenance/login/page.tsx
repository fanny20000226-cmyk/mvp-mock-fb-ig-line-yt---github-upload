"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function MaintenanceLoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/maintenance/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account, password })
      });
      const result = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        setError(result.message || "登入失敗，請確認帳號密碼");
        return;
      }

      router.push("/maintenance/dashboard");
      router.refresh();
    } catch {
      setError("登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-carcare-bg px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-carcare-yellow p-3 text-carcare-black">
            <LockKeyhole size={28} />
          </div>
          <div>
            <p className="text-sm font-black text-carcare-yellow">PEIWAY Monitor</p>
            <h1 className="text-2xl font-black">絕對後台監控維護平台</h1>
          </div>
        </div>

        <p className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          本平台為獨立只讀監控入口，不共用營運後台帳號，也不提供任何業務資料新增、修改、刪除功能。
        </p>

        <form className="space-y-4" onSubmit={login}>
          <input
            className="form-input"
            placeholder="維護帳號"
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            autoComplete="username"
          />
          <input
            className="form-input"
            type="password"
            placeholder="維護密碼"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          {error ? <p className="text-sm font-black text-red-600">{error}</p> : null}
          <button type="submit" className="primary-btn w-full justify-center" disabled={loading}>
            {loading ? "登入中..." : "登入監控平台"}
          </button>
        </form>
      </section>
    </main>
  );
}

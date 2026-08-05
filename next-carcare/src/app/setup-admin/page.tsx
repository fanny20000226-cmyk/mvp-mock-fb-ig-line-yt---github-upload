"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SetupStatus = {
  ok?: boolean;
  needsSetup?: boolean;
  adminCount?: number;
  message?: string;
};

type CreateResult = {
  ok?: boolean;
  message?: string;
  email?: string;
  account?: string;
  role?: string;
};

export default function SetupAdminPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin1234");
  const [account, setAccount] = useState("admin");
  const [name, setName] = useState("總管理員");
  const [shopId, setShopId] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreateResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/bootstrap")
      .then((response) => response.json())
      .then((data: SetupStatus) => setStatus(data))
      .catch(() =>
        setStatus({
          ok: false,
          needsSetup: false,
          message: "無法讀取初始化狀態。"
        })
      );
  }, []);

  async function submitSetup() {
    setLoading(true);
    setResult(null);

    const response = await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        account,
        name,
        shop_id: shopId || null,
        setupKey: setupKey || undefined
      })
    });
    const data = (await response.json()) as CreateResult;

    setLoading(false);
    setResult(data);

    if (data.ok) {
      setStatus({ ok: true, needsSetup: false, adminCount: 1 });
    }
  }

  const setupLocked = status?.needsSetup === false;

  return (
    <main className="min-h-screen bg-[#f8f8f8] p-5">
      <section className="mx-auto max-w-3xl rounded-[12px] bg-white p-6 shadow-xl">
        <div className="mb-6 flex flex-col gap-3 border-b border-neutral-200 pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black text-carcare-yellow">
              CarCare System
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#111]">
              建立第一個管理員帳號
            </h1>
            <p className="mt-2 text-sm text-[#666]">
              密碼會建立在 Supabase Auth，權限會記錄在系統 users 表。
            </p>
          </div>
          <Link className="secondary-btn text-center" href="/login">
            回登入頁
          </Link>
        </div>

        {status === null ? (
          <p className="rounded-xl bg-neutral-50 p-4 text-sm font-bold text-[#333]">
            正在檢查初始化狀態...
          </p>
        ) : setupLocked ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-black text-[#111]">初始化入口已鎖定</h2>
            <p className="mt-2 text-sm text-[#333]">
              系統已經有啟用中的管理員帳號，請直接回登入頁使用原帳號登入。
            </p>
            {status.message ? (
              <p className="mt-3 text-xs font-bold text-[#666]">{status.message}</p>
            ) : null}
          </div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!loading) void submitSetup();
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#333]">
                管理員信箱
              </span>
              <input
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#333]">
                登入密碼
              </span>
              <input
                className="form-input"
                value={password}
                type="password"
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#333]">
                  帳號代號
                </span>
                <input
                  className="form-input"
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-black text-[#333]">
                  顯示名稱
                </span>
                <input
                  className="form-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#333]">
                門市 ID（可留空，自動套用第一間門市）
              </span>
              <input
                className="form-input"
                value={shopId}
                onChange={(event) => setShopId(event.target.value)}
                placeholder="可留空"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black text-[#333]">
                初始化金鑰（若系統有設定才需要）
              </span>
              <input
                className="form-input"
                value={setupKey}
                onChange={(event) => setSetupKey(event.target.value)}
                placeholder="可留空"
              />
            </label>

            {result ? (
              <p
                className={`rounded-xl p-4 text-sm font-bold ${
                  result.ok
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border border-amber-300 bg-amber-50 text-neutral-900"
                }`}
              >
                {result.message}
              </p>
            ) : null}

            <button className="primary-btn w-full" disabled={loading} type="submit">
              {loading ? "建立中..." : "建立管理員帳號與權限"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

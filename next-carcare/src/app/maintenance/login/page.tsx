import { LockKeyhole } from "lucide-react";

type PageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function MaintenanceLoginPage({ searchParams }: PageProps) {
  const hasError = searchParams?.error === "1";

  return (
    <main className="min-h-screen bg-carcare-bg px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-carcare-yellow p-3 text-carcare-black">
            <LockKeyhole size={28} />
          </div>
          <div>
            <p className="text-sm font-black text-carcare-yellow">PEIWAY Monitor</p>
            <h1 className="text-2xl font-black">{"\u7d55\u5c0d\u5f8c\u53f0\u76e3\u63a7\u7dad\u8b77\u5e73\u53f0"}</h1>
          </div>
        </div>

        <p className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
          {"\u672c\u5e73\u53f0\u70ba\u7368\u7acb\u53ea\u8b80\u76e3\u63a7\u5165\u53e3\uff0c\u4e0d\u5171\u7528\u71df\u904b\u5f8c\u53f0\u5e33\u865f\uff0c\u4e5f\u4e0d\u63d0\u4f9b\u4efb\u4f55\u696d\u52d9\u8cc7\u6599\u65b0\u589e\u3001\u4fee\u6539\u3001\u522a\u9664\u529f\u80fd\u3002"}
        </p>

        <form className="space-y-4" action="/api/maintenance/login" method="post">
          <input
            className="form-input"
            name="account"
            placeholder={"\u7dad\u8b77\u5e33\u865f"}
            autoComplete="username"
            required
          />
          <input
            className="form-input"
            name="password"
            type="password"
            placeholder={"\u7dad\u8b77\u5bc6\u78bc"}
            autoComplete="current-password"
            required
          />
          {hasError ? (
            <p className="text-sm font-black text-red-600">{"\u7dad\u8b77\u5e33\u865f\u6216\u5bc6\u78bc\u4e0d\u6b63\u78ba"}</p>
          ) : null}
          <button type="submit" className="primary-btn w-full justify-center">
            {"\u767b\u5165\u76e3\u63a7\u5e73\u53f0"}
          </button>
        </form>
      </section>
    </main>
  );
}

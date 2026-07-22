"use client";

import { LogOut, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Sidebar from "./Sidebar";
import { signOut } from "@/lib/auth";
import type { UserProfile } from "@/lib/permissions";

export default function AppShell({
  profile,
  children
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-carcare-bg text-neutral-900">
      <Sidebar
        role={profile.role}
        name={profile.name}
        open={open}
        onClose={() => setOpen(false)}
      />
      <main className="min-h-screen p-4 transition-all duration-200 ease-out lg:ml-64 lg:p-8">
        <header className="mb-5 flex items-center justify-between rounded-xl bg-white p-4 shadow-soft">
          <button
            onClick={() => setOpen(true)}
            aria-label="開啟選單"
            className="rounded-lg border border-neutral-300 bg-white p-3 text-carcare-black transition duration-200 hover:border-carcare-yellow lg:hidden"
          >
            <Menu />
          </button>
          <div>
            <p className="text-xs font-bold text-neutral-500">CarCare System</p>
            <h2 className="text-lg font-black text-carcare-black">門店管理後台</h2>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-lg bg-carcare-yellow px-4 py-3 text-sm font-black text-carcare-black transition duration-200 hover:brightness-95"
          >
            <LogOut size={18} />
            登出
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}

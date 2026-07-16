"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "./AppShell";
import { getCurrentProfile } from "@/lib/auth";
import { canAccess, type UserProfile } from "@/lib/permissions";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentProfile().then((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      if (!canAccess(user.role, pathname)) {
        router.push("/dashboard");
        return;
      }
      setProfile(user);
      setLoading(false);
    });
  }, [pathname, router]);

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-carcare-bg">
        <div className="rounded-2xl bg-white p-8 font-black shadow-soft">
          載入中...
        </div>
      </main>
    );
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}


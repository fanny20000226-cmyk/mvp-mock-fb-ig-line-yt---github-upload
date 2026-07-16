"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  CalendarCheck,
  Car,
  FileText,
  Gift,
  Hammer,
  Image,
  LayoutDashboard,
  Shield,
  Users,
  Wallet
} from "lucide-react";
import { Role, roleLabels, roleMenus } from "@/lib/permissions";

const menu = [
  { href: "/dashboard", label: "管理總覽", icon: LayoutDashboard },
  { href: "/operations/cars", label: "車輛客戶", icon: Car },
  { href: "/operations/quotations", label: "報價單", icon: FileText },
  { href: "/operations/construction", label: "施工單", icon: Hammer },
  { href: "/annotations", label: "圖片標註", icon: Image },
  { href: "/finance/payments", label: "收款登記", icon: Wallet },
  { href: "/finance/reports", label: "財務報表", icon: BadgeDollarSign },
  { href: "/hr/employees", label: "員工資料", icon: Users },
  { href: "/hr/attendance", label: "考勤紀錄", icon: CalendarCheck },
  { href: "/bonus", label: "獎金設定", icon: Gift },
  { href: "/permissions", label: "權限管理", icon: Shield }
];

export default function Sidebar({
  role,
  name,
  open,
  onClose
}: {
  role: Role;
  name: string;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const allowed = roleMenus[role] || [];

  const body = (
    <>
      <div className="border-b border-white/10 p-6">
        <h1 className="text-2xl font-black text-carcare-yellow">CarCare</h1>
        <p className="mt-1 text-sm text-white/60">多門店管理系統</p>
        <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm">
          {name} · {roleLabels[role]}
        </p>
      </div>
      <nav className="space-y-1 p-3">
        {menu
          .filter((item) => allowed.some((path) => item.href.startsWith(path)))
          .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition ${
                  active
                    ? "bg-carcare-yellow text-carcare-black"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </>
  );

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 bg-carcare-black text-white lg:block">
        {body}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="close menu"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative h-full w-72 bg-carcare-black text-white shadow-2xl">
            {body}
          </aside>
        </div>
      ) : null}
    </>
  );
}


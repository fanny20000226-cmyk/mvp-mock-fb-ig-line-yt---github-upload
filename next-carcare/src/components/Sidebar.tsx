"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  CalendarCheck,
  Car,
  ClipboardList,
  ClipboardPaste,
  FileText,
  Gift,
  Hammer,
  Image,
  LayoutDashboard,
  ListChecks,
  Shield,
  Sparkles,
  Users,
  Wallet
} from "lucide-react";
import { Role, roleLabels, roleMenus } from "@/lib/permissions";

const menu = [
  { href: "/dashboard", label: "工作台", icon: LayoutDashboard },
  { href: "/operations/paste-reservation", label: "貼上填單", icon: ClipboardPaste },
  { href: "/operations/quotations", label: "預約評估", icon: ClipboardList },
  { href: "/operations/quotations", label: "製作報價單", icon: FileText },
  { href: "/operations/orders", label: "訂單管理", icon: ListChecks },
  { href: "/operations/services", label: "門市服務價格設定", icon: Sparkles },
  { href: "/operations/construction", label: "施工訂單", icon: Hammer },
  { href: "/operations/cars", label: "車輛相簿", icon: Car },
  { href: "/annotations", label: "圖片標註", icon: Image },
  { href: "/finance/payments", label: "收款核銷", icon: Wallet },
  { href: "/finance/reports", label: "財務報表", icon: BadgeDollarSign },
  { href: "/hr/employees", label: "人員資料", icon: Users },
  { href: "/hr/attendance", label: "出勤打卡", icon: CalendarCheck },
  { href: "/bonus", label: "獎金設定", icon: Gift },
  { href: "/permissions", label: "系統設定", icon: Shield }
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
        <h1 className="text-2xl font-black text-carcare-yellow">CarCare System</h1>
        <p className="mt-1 text-sm text-white/60">多門店汽車美容管理</p>
        <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-sm">
          {name} / {roleLabels[role]}
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
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-black transition ${
                  active ? "bg-carcare-yellow text-carcare-black" : "text-white hover:bg-white/10"
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
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 overflow-y-auto bg-carcare-black text-white lg:block">
        {body}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="關閉選單"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="relative h-full w-72 overflow-y-auto bg-carcare-black text-white shadow-2xl">
            {body}
          </aside>
        </div>
      ) : null}
    </>
  );
}

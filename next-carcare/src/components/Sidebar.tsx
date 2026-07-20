"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarCheck,
  CalendarX,
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
  Wallet,
  ChevronDown,
  X
} from "lucide-react";
import { Role, roleLabels, roleMenus } from "@/lib/permissions";

const menuGroups = [
  {
    label: "工作台",
    icon: LayoutDashboard,
    items: [{ href: "/dashboard", label: "工作台", icon: LayoutDashboard }]
  },
  {
    label: "預約評估",
    icon: ClipboardList,
    items: [
      { href: "/operations/evaluation", label: "預約評估", icon: ClipboardList },
      { href: "/operations/paste-reservation", label: "貼上填單", icon: ClipboardPaste },
      { href: "/operations/orders", label: "訂單管理", icon: ListChecks },
      { href: "/operations/cancellations", label: "取消 / 改期", icon: CalendarX }
    ]
  },
  {
    label: "製作報價單",
    icon: FileText,
    items: [
      { href: "/operations/quotations", label: "新建打翻評估報價單", icon: FileText },
      { href: "/operations/quotations", label: "歷史報價/工單紀錄", icon: ListChecks },
      { href: "/operations/services", label: "門市服務價格設定", icon: Sparkles }
    ]
  },
  {
    label: "施工開單",
    icon: Hammer,
    items: [
      { href: "/operations/construction", label: "施工訂單", icon: Hammer },
      { href: "/annotations", label: "圖片標註", icon: Image }
    ]
  },
  {
    label: "車輛相簿",
    icon: Car,
    items: [
      { href: "/operations/customers", label: "客戶資料查詢", icon: Users },
      { href: "/operations/cars", label: "車輛相簿", icon: Car }
    ]
  },
  {
    label: "財務報表",
    icon: BadgeDollarSign,
    items: [
      { href: "/finance/payments", label: "收款核銷", icon: Wallet },
      { href: "/finance/reports", label: "財務報表", icon: BadgeDollarSign },
      { href: "/bonus", label: "獎金設定", icon: Gift }
    ]
  },
  {
    label: "人員打卡",
    icon: CalendarCheck,
    items: [
      { href: "/hr/attendance", label: "出勤打卡", icon: CalendarCheck },
      { href: "/hr/employees", label: "人員資料", icon: Users }
    ]
  },
  {
    label: "系統設定",
    icon: Shield,
    items: [{ href: "/permissions", label: "系統設定", icon: Shield }]
  }
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
  const allowed = useMemo(() => roleMenus[role] || [], [role]);
  const visibleGroups = useMemo(
    () =>
      menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => allowed.some((path) => item.href.startsWith(path)))
        }))
        .filter((group) => group.items.length),
    [allowed]
  );
  const defaultOpen = useMemo(() => {
    const activeGroup = visibleGroups.find((group) =>
      group.items.some((item) => pathname.startsWith(item.href))
    );
    return activeGroup?.label || visibleGroups[0]?.label || "";
  }, [pathname, visibleGroups]);
  const [expanded, setExpanded] = useState(defaultOpen);

  const body = (
    <>
      <div className="flex items-start justify-between border-b border-white/10 p-5">
        <div>
          <h1 className="text-2xl font-black text-carcare-yellow">CarCare System</h1>
          <p className="mt-1 text-sm text-white/60">多門店汽車美容管理</p>
          <p className="mt-4 rounded-lg bg-white/10 px-3 py-2 text-sm">
            {name} / {roleLabels[role]}
          </p>
        </div>
        <button
          type="button"
          aria-label="關閉選單"
          onClick={onClose}
          className="rounded-lg border border-white/15 p-2 text-white transition duration-200 hover:border-carcare-yellow lg:hidden"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="space-y-2 p-3">
        {visibleGroups.map((group) => {
          const GroupIcon = group.icon;
          const groupActive = group.items.some((item) => pathname.startsWith(item.href));
          const singleItem = group.items.length === 1 && group.items[0].label === group.label;
          const groupOpen = expanded === group.label || groupActive;
          if (singleItem) {
            const item = group.items[0];
            return (
              <Link
                key={group.label}
                href={item.href}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-black transition duration-200 ${
                  groupActive
                    ? "bg-carcare-yellow text-carcare-black"
                    : "text-white hover:bg-white/10 hover:ring-1 hover:ring-carcare-yellow"
                }`}
              >
                <GroupIcon size={18} />
                {group.label}
              </Link>
            );
          }
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => setExpanded(groupOpen && !groupActive ? "" : group.label)}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-black transition duration-200 ${
                  groupActive ? "bg-carcare-yellow text-carcare-black" : "text-white hover:bg-white/10 hover:ring-1 hover:ring-carcare-yellow"
                }`}
              >
                <span className="flex items-center gap-3">
                  <GroupIcon size={18} />
                  {group.label}
                </span>
                <ChevronDown
                  size={16}
                  className={`transition duration-200 ${groupOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`overflow-hidden pl-3 transition-all duration-200 ease-out ${
                  groupOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="mt-1 space-y-1 border-l border-white/10 pl-2">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-black transition duration-200 ${
                          active
                            ? "bg-carcare-yellow text-carcare-black"
                            : "text-white hover:bg-white/10 hover:ring-1 hover:ring-carcare-yellow"
                        }`}
                      >
                        <Icon size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
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
      <div
        className={`fixed inset-0 z-50 transition duration-200 lg:hidden ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          aria-label="關閉選單"
          onClick={onClose}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`relative h-full w-72 overflow-y-auto bg-carcare-black text-white shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {body}
        </aside>
      </div>
    </>
  );
}

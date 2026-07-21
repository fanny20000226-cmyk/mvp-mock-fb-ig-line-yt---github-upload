export type Role =
  | "admin"
  | "finance"
  | "hr"
  | "shop_manager"
  | "vice_manager"
  | "worker";

export type UserProfile = {
  id: string;
  shop_id: string | null;
  account: string;
  name: string;
  role: Role;
  active: boolean;
};

export const roleLabels: Record<Role, string> = {
  admin: "總管理員",
  finance: "財務",
  hr: "人資",
  shop_manager: "店長",
  vice_manager: "副店長",
  worker: "施工人員"
};

export const roleMenus: Record<Role, string[]> = {
  admin: [
    "/dashboard",
    "/operations/paste-reservation",
    "/operations/evaluation",
    "/operations/orders",
    "/operations/calendar",
    "/operations/cancellations",
    "/operations/customers",
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/hr/employees",
    "/hr/attendance",
    "/hr/payroll",
    "/bonus",
    "/permissions"
  ],
  finance: ["/dashboard", "/finance/payments", "/finance/reports", "/finance/receipts"],
  hr: ["/dashboard", "/hr/employees", "/hr/attendance", "/hr/payroll"],
  shop_manager: [
    "/dashboard",
    "/operations/paste-reservation",
    "/operations/evaluation",
    "/operations/orders",
    "/operations/calendar",
    "/operations/cancellations",
    "/operations/customers",
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/hr/employees",
    "/hr/attendance",
    "/hr/payroll"
  ],
  vice_manager: [
    "/dashboard",
    "/operations/paste-reservation",
    "/operations/evaluation",
    "/operations/orders",
    "/operations/calendar",
    "/operations/cancellations",
    "/operations/customers",
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/hr/employees",
    "/hr/attendance",
    "/hr/payroll"
  ],
  worker: ["/dashboard", "/operations/calendar", "/operations/construction", "/annotations"]
};

export function canAccess(role: Role, path: string) {
  return roleMenus[role]?.some((item) => path.startsWith(item));
}

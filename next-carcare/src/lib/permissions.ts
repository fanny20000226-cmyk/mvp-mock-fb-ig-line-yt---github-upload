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
  worker: "員工",
};

export const roleMenus: Record<Role, string[]> = {
  admin: [
    "/dashboard",
    "/operations/mobile-order",
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
    "/operations/field-mode",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/settings/n8n",
    "/settings/n8n-realtime",
    "/settings/n8n-logs",
    "/settings/health",
    "/settings/system-test",
    "/settings/enterprise",
    "/settings/catalogs",
    "/bi",
    "/sop",
    "/manual",
    "/delivery-readiness",
    "/hr/employees",
    "/hr/attendance",
    "/hr/staff-accounts",
    "/hr/payroll",
    "/staff/login",
    "/staff/dashboard",
    "/bonus",
    "/permissions",
  ],
  finance: [
    "/dashboard",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/staff/login",
    "/staff/dashboard",
    "/sop",
  ],
  hr: [
    "/dashboard",
    "/hr/employees",
    "/hr/attendance",
    "/hr/staff-accounts",
    "/hr/payroll",
    "/staff/login",
    "/staff/dashboard",
    "/sop",
  ],
  shop_manager: [
    "/dashboard",
    "/operations/mobile-order",
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
    "/operations/field-mode",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/settings/health",
    "/settings/system-test",
    "/settings/enterprise",
    "/settings/catalogs",
    "/bi",
    "/sop",
    "/manual",
    "/delivery-readiness",
    "/hr/attendance",
    "/hr/staff-accounts",
    "/hr/payroll",
    "/staff/login",
    "/staff/dashboard",
  ],
  vice_manager: [
    "/dashboard",
    "/operations/mobile-order",
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
    "/operations/field-mode",
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/hr/attendance",
    "/staff/login",
    "/staff/dashboard",
    "/sop",
  ],
  worker: [
    "/dashboard",
    "/operations/calendar",
    "/operations/construction",
    "/operations/field-mode",
    "/annotations",
    "/staff/login",
    "/staff/dashboard",
    "/sop",
  ],
};

export function canAccess(role: Role, path: string) {
  return roleMenus[role]?.some((item) => path.startsWith(item));
}

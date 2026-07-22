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
  admin: "Admin",
  finance: "Finance",
  hr: "HR",
  shop_manager: "Shop Manager",
  vice_manager: "Vice Manager",
  worker: "Worker",
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
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
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
  ],
  hr: [
    "/dashboard",
    "/hr/employees",
    "/hr/attendance",
    "/hr/staff-accounts",
    "/hr/payroll",
    "/staff/login",
    "/staff/dashboard",
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
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
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
    "/annotations",
    "/finance/payments",
    "/finance/transactions",
    "/finance/reports",
    "/finance/receipts",
    "/notifications",
    "/hr/attendance",
    "/staff/login",
    "/staff/dashboard",
  ],
  worker: [
    "/dashboard",
    "/operations/mobile-order",
    "/operations/calendar",
    "/operations/construction",
    "/annotations",
    "/staff/login",
    "/staff/dashboard",
  ],
};

export function canAccess(role: Role, path: string) {
  return roleMenus[role]?.some((item) => path.startsWith(item));
}

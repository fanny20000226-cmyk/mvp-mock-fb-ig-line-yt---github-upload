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
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/reports",
    "/hr/employees",
    "/hr/attendance",
    "/bonus",
    "/permissions"
  ],
  finance: ["/dashboard", "/finance/payments", "/finance/reports"],
  hr: ["/dashboard", "/hr/employees", "/hr/attendance"],
  shop_manager: [
    "/dashboard",
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/reports",
    "/hr/employees",
    "/hr/attendance"
  ],
  vice_manager: [
    "/dashboard",
    "/operations/cars",
    "/operations/services",
    "/operations/quotations",
    "/operations/construction",
    "/annotations",
    "/finance/payments",
    "/finance/reports",
    "/hr/employees",
    "/hr/attendance"
  ],
  worker: ["/dashboard", "/operations/construction", "/annotations"]
};

export function canAccess(role: Role, path: string) {
  return roleMenus[role]?.some((item) => path.startsWith(item));
}

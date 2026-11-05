// Staff (admin) manage in-store orders and their notification inbox.
// All other dashboard management, including loyalty and appointments, is owner-only.
export function isSuperadmin(role: unknown): boolean {
  return role === "superadmin";
}

export function canAccessDashboardPath(role: unknown, pathname: string): boolean {
  if (isSuperadmin(role)) return true;
  return role === "admin" && ["/dashboard/store-order", "/dashboard/notifications"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

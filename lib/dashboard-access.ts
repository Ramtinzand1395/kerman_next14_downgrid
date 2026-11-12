// Staff can process orders and appointments and use their notification inbox.
export function isSuperadmin(role: unknown): boolean {
  return role === "superadmin";
}

export function canAccessDashboardPath(role: unknown, pathname: string): boolean {
  if (isSuperadmin(role)) return true;
  if (role === "admin" && pathname === "/dashboard/appointments") return true;
  return role === "admin" && ["/dashboard/store-order", "/dashboard/notifications"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

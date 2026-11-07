import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessDashboardPath } from "@/lib/dashboard-access";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;

    const pathname = req.nextUrl.pathname;

    const isDashboardPath = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
    if (isDashboardPath) {
      if (canAccessDashboardPath(role, pathname)) return NextResponse.next();
      return NextResponse.redirect(new URL(role === "admin" ? "/dashboard/store-order" : "/", req.url));
    }

    // --- مسیر /my-profile فقط برای کاربران وارد شده ---
    if ((pathname.startsWith("/my-profile") || pathname.startsWith("/notifications")) && !role) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  },
  {
    pages: { signIn: "/auth/login" },
    callbacks: {
      authorized: ({ token }) => !!token, // توکن وجود داشته باشد
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/my-profile/:path*", "/notifications/:path*"], // مسیرهای محافظت شده
};

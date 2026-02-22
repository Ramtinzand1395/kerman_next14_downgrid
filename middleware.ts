import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;

    const pathname = req.nextUrl.pathname;

    // --- مسیر /dashboard فقط برای superadmin ---
    const isDashboardPath = pathname.startsWith("/dashboard");
    const isStoreOrderPath = pathname.startsWith("/dashboard/store-order");

    // superadmin به همه مسیرهای داشبورد دسترسی دارد
    if (isDashboardPath && role === "superadmin") {
      return NextResponse.next();
    }

    // admin فقط به مسیرهای store-order داشبورد دسترسی دارد
    if (isDashboardPath && role === "admin" && !isStoreOrderPath) {
      return NextResponse.redirect(new URL("/dashboard/store-order", req.url));
    }

    if (isDashboardPath && role !== "superadmin" && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // --- مسیر /my-profile فقط برای کاربران وارد شده ---
    if (pathname.startsWith("/my-profile") && !role) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // توکن وجود داشته باشد
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/my-profile/:path*"], // مسیرهای محافظت شده
};

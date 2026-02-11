import "@/app/globals.css";
import localFont from "next/font/local";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthProvider from "@/app/AuthProvider";
import DashboardSidebar from "./components/DashboardSidebar";

const vazir = localFont({
  src: "./Vazir.woff2",
  display: "swap",
});

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa-IR" dir="rtl" className={vazir.className}>
      <head>
        {/* جلوگیری از ایندکس صفحات داشبورد */}
        <meta name="robots" content="noindex, nofollow" />

        {/* متاتگ‌های پایه */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* عنوان پیش‌فرض */}
        <title>پنل مدیریت | Dashboard</title>

        {/* آیکون سایت */}
        <link rel="icon" href="/favicon.ico" />
      </head>

      <body className="flex h-screen overflow-hidden">
        <AuthProvider>
          {/* Sidebar ثابت در سمت راست */}
          <DashboardSidebar />
          {/* محتوای صفحات */}
          <main className="flex-1 overflow-y-auto  ">{children}</main>
        </AuthProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </body>
    </html>
  );
}

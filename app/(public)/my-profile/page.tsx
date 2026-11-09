import type { Metadata } from "next";
import Sidebar from "./Sidebar";
import Stepper from "./Stepper";
import ProfileContent from "./ProfileContent";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  alternates: {
    canonical: "/my-profile",
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface MyProfilePageProps {
  searchParams?: { step?: string; fulfillment?: string };
}

export default async function MyProfile({ searchParams }: MyProfilePageProps) {
  const data = await searchParams;
  const activeStep = Number(data?.step ?? 1);
  const initialFulfillment =
    data?.fulfillment === "courier" || data?.fulfillment === "in_store"
      ? data.fulfillment
      : null;

  // سفارش‌های نصب بازی (مرحله ۷) اکنون در همان صفحه سفارش‌ها (مرحله ۵) نمایش داده می‌شود
  if (activeStep === 7) {
    redirect("/my-profile?step=5");
  }

  return (
    <div className="container mx-auto px-3 md:px-6 py-6 md:py-8">
      <div className="grid min-w-0 grid-cols-1 gap-5 md:gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />

        <section className="min-w-0 space-y-4 md:space-y-5">
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 md:p-5 shadow-sm">
            <Stepper activeStep={activeStep} />
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3 md:p-5 shadow-sm min-h-[520px]">
            <ProfileContent activeStep={activeStep} initialFulfillment={initialFulfillment} />
          </div>
        </section>
      </div>
    </div>
  );
}

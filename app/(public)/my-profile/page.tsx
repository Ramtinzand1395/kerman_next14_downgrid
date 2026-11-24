import type { Metadata } from "next";
import MyAccounts from "./MyAccounts";
import Sidebar from "./Sidebar";
import ProfileContent from "./ProfileContent";
import { redirect } from "next/navigation";
import { PROFILE_STEPS, profileRoute } from "@/lib/profileRoutes";

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
  searchParams?: { step?: string; fulfillment?: string; ordersTab?: string };
}

export default function MyProfile({ searchParams }: MyProfilePageProps) {
  const activeStep = Number(searchParams?.step ?? PROFILE_STEPS.profile);
  const initialFulfillment =
    searchParams?.fulfillment === "courier" || searchParams?.fulfillment === "in_store"
      ? searchParams.fulfillment
      : null;

  if (activeStep === 7) {
    redirect(profileRoute("orders", { ordersTab: searchParams?.ordersTab }));
  }

  return (
    <div className="container mx-auto px-3 py-6 md:px-6 md:py-8">
      <div className="grid min-w-0 grid-cols-1 gap-5 md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar activeStep={activeStep} />

        <div className="min-h-[520px] min-w-0 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-3 shadow-sm md:p-5">
          {activeStep === PROFILE_STEPS.accounts ? (
            <MyAccounts />
          ) : (
            <ProfileContent activeStep={activeStep} initialFulfillment={initialFulfillment} />
          )}
        </div>
      </div>
    </div>
  );
}

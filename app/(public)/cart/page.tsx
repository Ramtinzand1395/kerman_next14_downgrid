export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { Suspense } from "react";
import CartPage from "./CartPage";

export const metadata: Metadata = {
  alternates: {
    canonical: "/cart",
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface CartPageProps {
  searchParams?: {
    step?: string | string[];
  };
}

export default async function page({ searchParams }: CartPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    const requestedStep = Array.isArray(searchParams?.step)
      ? searchParams.step[0]
      : searchParams?.step;
    const safeStep = ["1", "2", "3"].includes(requestedStep ?? "")
      ? requestedStep
      : undefined;
    const callbackUrl = safeStep ? `/cart?step=${safeStep}` : "/cart";

    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<div className="p-10">در حال بارگذاری...</div>}>
      <CartPage />
    </Suspense>
  );
}

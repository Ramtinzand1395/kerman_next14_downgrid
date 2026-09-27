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

export default async function page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login?callbackUrl=%2Fcart");
  }

  return (
    <Suspense fallback={<div className="p-10">در حال بارگذاری...</div>}>
      <CartPage />
    </Suspense>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import TempPayment from "@/model/TempPayment";
import { formatOrderShippingDisplay } from "@/lib/shipping";

export const metadata: Metadata = {
  alternates: {
    canonical: "/payment-failed",
  },
  robots: {
    index: false,
    follow: false,
  },
};

interface PaymentFailedPageProps {
  searchParams: {
    authority?: string;
    status?: string;
  };
}

export default async function PaymentFailedPage({
  searchParams,
}: PaymentFailedPageProps) {
  const params = searchParams;
  const session = await getServerSession(authOptions);
  let attempt: any = null;
  if (session?.user?.id && params.authority) {
    await dbConnect();
    attempt = await TempPayment.findOne({
      authority: params.authority,
      userId: session.user.id,
    }).lean();
  }
  const shipping = attempt ? formatOrderShippingDisplay(attempt) : null;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h1 className="text-2xl font-bold">پرداخت ناموفق بود ❌</h1>
        <p className="mt-3 text-sm leading-7">
          پرداخت شما تایید نشد یا توسط کاربر لغو شد. اگر مبلغی کسر شده باشد، طبق
          سیاست زرین‌پال به حساب شما بازمی‌گردد.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-white p-4 text-sm">
          {attempt && shipping && (
            <>
              <p><span className="font-semibold">روش ارسال:</span> {shipping.title}</p>
              <p><span className="font-semibold">هزینه ارسال:</span> {shipping.label}</p>
              <p><span className="font-semibold">مبلغ تلاش پرداخت آنلاین:</span> {Number(attempt.finalPrice).toLocaleString("fa-IR")} تومان</p>
              {shipping.subtext && <p className="text-xs leading-6 text-amber-700">{shipping.subtext}</p>}
            </>
          )}
          {params.status && (
            <p>
              <span className="font-semibold">Status:</span> {params.status}
            </p>
          )}
          {params.authority && (
            <p>
              <span className="font-semibold">Authority:</span> {params.authority}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/cart"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            بازگشت به سبد خرید
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold"
          >
            صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}

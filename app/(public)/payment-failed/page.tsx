import Link from "next/link";

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

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
        <h1 className="text-2xl font-bold">پرداخت ناموفق بود ❌</h1>
        <p className="mt-3 text-sm leading-7">
          پرداخت شما تایید نشد یا توسط کاربر لغو شد. اگر مبلغی کسر شده باشد، طبق
          سیاست زرین‌پال به حساب شما بازمی‌گردد.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-white p-4 text-sm">
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

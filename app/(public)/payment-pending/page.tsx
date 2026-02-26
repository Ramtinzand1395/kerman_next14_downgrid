import Link from "next/link";

interface PaymentPendingPageProps {
  searchParams: {
    orderId?: string;
    authority?: string;
    refId?: string;
  };
}

export default async function PaymentPendingPage({
  searchParams,
}: PaymentPendingPageProps) {
  const params = searchParams;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-2xl font-bold">پرداخت ثبت شد، در حال بررسی ⏳</h1>
        <p className="mt-3 text-sm leading-7">
          پرداخت شما در درگاه با موفقیت ثبت شده است، اما تکمیل سفارش نیاز به بررسی
          دارد. تیم پشتیبانی وضعیت سفارش/بازپرداخت را پیگیری می‌کند.
        </p>

        <div className="mt-4 space-y-2 rounded-xl bg-white p-4 text-sm">
          {params.orderId && (
            <p>
              <span className="font-semibold">شناسه سفارش:</span> {params.orderId}
            </p>
          )}
          {params.authority && (
            <p>
              <span className="font-semibold">Authority:</span> {params.authority}
            </p>
          )}
          {params.refId && (
            <p>
              <span className="font-semibold">Ref ID:</span> {params.refId}
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/my-profile"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
          >
            مشاهده سفارش‌ها
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}

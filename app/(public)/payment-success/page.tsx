import Link from "next/link";

interface PaymentSuccessPageProps {
  searchParams: {
    orderId?: string;
    authority?: string;
    refId?: string;
  };
}

export default async function PaymentSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const params = searchParams;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <h1 className="text-2xl font-bold">پرداخت با موفقیت انجام شد ✅</h1>
        <p className="mt-3 text-sm leading-7">
          سفارش شما با موفقیت ثبت شد و موجودی محصولات به‌صورت خودکار کسر شده است.
          جزئیات پرداخت در سفارش ذخیره شد.
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            مشاهده سفارش‌ها
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold"
          >
            بازگشت به صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}

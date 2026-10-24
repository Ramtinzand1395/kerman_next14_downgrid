import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { CheckCircle2, Clock3, FileText, ShieldAlert, XCircle } from "lucide-react";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import ProductImage from "@/app/components/ProductImage";
import dbConnect from "@/lib/mongodb";
import { getOrderForViewer } from "@/lib/orderAccess";
import OrderMoneySummaryView from "../components/OrderMoneySummary";
import ClearCartOnSuccess from "./ClearCartOnSuccess";
import ReceiptActions from "./ReceiptActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "نتیجه پرداخت",
  robots: { index: false, follow: false, nocache: true },
};

interface PaymentSuccessPageProps {
  searchParams: { orderId?: string };
}

const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Tehran",
      }).format(new Date(value))
    : "ثبت نشده";

const paymentLabels: Record<string, string> = {
  zarinpal: "پرداخت اینترنتی",
  wallet: "کیف پول کرمان آتاری",
};

const orderStatusLabels: Record<string, string> = {
  pending: "در انتظار بررسی",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل‌شده",
  cancelled: "لغوشده",
};

function StateCard({
  state,
}: {
  state: "login" | "missing" | "failed" | "review" | "refund";
}) {
  const content = {
    login: {
      icon: ShieldAlert,
      title: "برای مشاهده نتیجه پرداخت وارد شوید",
      description: "رسید سفارش فقط برای صاحب سفارش یا مدیر قابل مشاهده است.",
    },
    missing: {
      icon: ShieldAlert,
      title: "سفارش قابل نمایش نیست",
      description:
        "شناسه سفارش نامعتبر است، سفارش وجود ندارد یا اجازه مشاهده آن را ندارید.",
    },
    failed: {
      icon: XCircle,
      title: "پرداخت این سفارش موفق نبوده است",
      description: "هیچ رسید پرداخت موفقی برای این سفارش صادر نشده است.",
    },
    review: {
      icon: Clock3,
      title: "پرداخت در حال بررسی است",
      description:
        "نتیجه قطعی هنوز ثبت نشده است. از بخش سفارش‌ها وضعیت را دوباره بررسی کنید.",
    },
    refund: {
      icon: ShieldAlert,
      title: "پرداخت نیازمند بررسی بازپرداخت است",
      description:
        "وجه تأیید شده اما تکمیل سفارش ممکن نشده است. وضعیت بازپرداخت از بخش سفارش‌ها قابل پیگیری است.",
    },
  }[state];
  const Icon = content.icon;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10">
        <Icon className="mx-auto h-14 w-14 text-blue-800" />
        <h1 className="mt-5 text-2xl font-black text-slate-950">{content.title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-600">
          {content.description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {state === "login" && (
            <Link href="/auth/login?callbackUrl=%2Fmy-profile%3Fstep%3D5" className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white">
              ورود به حساب
            </Link>
          )}
          <Link href="/my-profile?step=5" className="rounded-xl border border-blue-200 px-5 py-3 text-sm font-bold text-blue-900">
            مشاهده سفارش‌ها
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return <StateCard state="login" />;
  if (!searchParams.orderId) return <StateCard state="missing" />;

  await dbConnect();
  const order = await getOrderForViewer({
    orderId: searchParams.orderId,
    userId: session.user.id,
    role: session.user.role,
  });

  if (!order) return <StateCard state="missing" />;
  if (order.payment.status === "pending_refund") return <StateCard state="refund" />;
  if (order.payment.status === "failed") return <StateCard state="failed" />;
  if (order.payment.status !== "paid") return <StateCard state="review" />;

  return (
    <>
      <ClearCartOnSuccess items={order.items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity }))} />
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-[0_18px_55px_rgba(15,45,90,0.10)]">
          <div className="bg-blue-950 px-5 py-8 text-white md:px-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> پرداخت تأیید شد
                </span>
                <h1 className="mt-4 text-2xl font-black md:text-3xl">پرداخت شما با موفقیت انجام شد</h1>
                <p className="mt-2 text-sm leading-7 text-blue-100">
                  سفارش ثبت شده و اکنون در وضعیت «{orderStatusLabels[order.status] || order.status}» قرار دارد.
                </p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
                <p className="text-xs text-blue-100">کد پیگیری سفارش</p>
                <p dir="ltr" className="mt-1 font-mono text-lg font-black tracking-wider">{order.trackingCode}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-5 md:p-9 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-6">
              <section>
                <h2 className="text-lg font-black text-slate-950">خلاصه محصولات</h2>
                <div className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <article key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 p-3">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                        <ProductImage src={item.image || "/atari-seeklogo.svg"} alt={item.title} fill sizes="80px" className="object-contain p-2" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        {item.variantAttributes?.length ? <p className="mt-1 text-xs text-slate-500">{item.variantAttributes.map((attribute) => `${attribute.label}: ${attribute.optionLabel}`).join(" · ")}</p> : item.variantTitle ? <p className="mt-1 text-xs text-slate-500">مدل: {item.variantTitle}</p> : null}
                        <p className="mt-2 text-xs text-slate-600">تعداد {item.quantity.toLocaleString("fa-IR")} · مبلغ ردیف {item.total.toLocaleString("fa-IR")} تومان</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              {order.address && (
                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="font-black text-slate-900">آدرس و ارسال</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {order.address.province}، {order.address.city}، {order.address.address}
                    {order.address.plaque ? `، پلاک ${order.address.plaque}` : ""}
                    {order.address.unit ? `، واحد ${order.address.unit}` : ""}
                  </p>
                  {order.address.postalCode && <p className="mt-1 text-xs text-slate-500">کد پستی: {order.address.postalCode}</p>}
                  <p className="mt-3 text-sm font-bold text-blue-900">
                    روش ارسال: {order.shipping.title} — {order.shipping.label}
                  </p>
                  {order.shipping.note && <p className="mt-1 text-xs text-amber-700">{order.shipping.note}</p>}
                </section>
              )}
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h2 className="font-black text-slate-900">رسید پرداخت</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">شماره سفارش</dt><dd dir="ltr" className="font-bold text-slate-900">{order.orderNumber}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">زمان پرداخت</dt><dd className="text-left font-bold text-slate-900">{dateTime(order.payment.verifiedAt)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">روش پرداخت</dt><dd className="font-bold text-slate-900">{paymentLabels[order.payment.gateway || ""] || "ثبت نشده"}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">مبلغ پرداخت‌شده آنلاین</dt><dd className="font-bold text-slate-900">{order.payment.amountPaidOnlineToman.toLocaleString("fa-IR")} تومان</dd></div>
                  {order.payment.referenceId && <div className="flex justify-between gap-4"><dt className="text-slate-500">شماره مرجع پرداخت</dt><dd dir="ltr" className="font-mono font-bold text-slate-900">{order.payment.referenceId}</dd></div>}
                </dl>
              </section>

              <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                <OrderMoneySummaryView summary={order.summary} shippingLabel={order.shipping.label} shippingNote={order.shipping.note} compact />
              </section>

              {order.historicalFallback && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                  بخشی از جزئیات این سفارش قدیمی از داده موجود فعلی بازیابی شده و ممکن است snapshot کامل زمان خرید نباشد.
                </p>
              )}
            </aside>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 p-5 md:px-9 print:hidden">
            <Link href={`/my-profile/orders/${order.id}/invoice`} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white"><FileText className="h-4 w-4" /> مشاهده فاکتور</Link>
            <ReceiptActions />
            <Link href="/my-profile?step=5" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">مشاهده سفارش‌ها</Link>
            <Link href="/products" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800">ادامه خرید</Link>
          </div>
        </section>
      </main>
    </>
  );
}

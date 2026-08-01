// "use client";

// import { formatPrice } from "@/helpers/Price";
// import useCartStore from "@/stores/cartStore";
// import { Address } from "@/types";
// import { ArrowLeft, CreditCard, Loader2, MapPin } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { useMemo, useRef, useState } from "react";
// import { toast } from "react-toastify";

// interface PaymentFormProps {
//   selectedAddress: Address;
// }

// export default function PaymentForm({ selectedAddress }: PaymentFormProps) {
//   const { cart } = useCartStore();
//   const router = useRouter();
//   const [loading, setLoading] = useState(false);
//   const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
//   const shippingCost = 0;

//   const orderSummary = useMemo(() => {
//     const subtotal = cart.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0,
//     );

//     const discount = cart.reduce(
//       (sum, item) =>
//         sum + (item.price - (item.discountPrice ?? item.price)) * item.quantity,
//       0,
//     );

//     return {
//       subtotal,
//       discount,
//       final: subtotal - discount + shippingCost,
//     };
//   }, [cart]);

//   const submitOrder = async () => {
//     if (cart.length === 0 || loading) return;

//     setLoading(true);

//     try {
//       const orderPayload = {
//         addressId: selectedAddress._id,
//         shippingCost,
//         items: cart.map((item) => ({
//           productId: item.productId,
//           variantId: item.variantId,
//           quantity: item.quantity,
//         })),
//       };

//       const paymentResponse = await fetch("/api/payment-zarinpal/request", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Idempotency-Key": idempotencyKeyRef.current,
//         },
//         body: JSON.stringify(orderPayload),
//       });

//       const paymentData = await paymentResponse.json().catch(() => ({}));

//       if (!paymentResponse.ok || !paymentData.success || !paymentData.url) {
//         throw new Error(paymentData.error || "PAYMENT_REQUEST_FAILED");
//       }

//       toast.success("در حال انتقال به درگاه پرداخت...");
//       // clearCart();
//       router.push(paymentData.url);
//     } catch (error) {
//       const errorMessage =
//         error instanceof Error && error.message
//           ? error.message
//           : "ایجاد سفارش یا اتصال به درگاه پرداخت ناموفق بود.";

//       toast.error(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
//       <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
//         <div>
//           <h2 className="text-lg font-bold text-slate-900">
//             مرور نهایی و پرداخت
//           </h2>
//           <p className="text-sm text-slate-500">
//             اطلاعات سفارش را بررسی کنید و سپس وارد درگاه شوید.
//           </p>
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
//           روش پرداخت: درگاه امن زرین‌پال
//         </div>
//       </div>

//       <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
//         <section className="rounded-2xl border border-slate-200 p-4 lg:col-span-3">
//           <h3 className="mb-3 text-sm font-bold text-slate-800">اقلام سفارش</h3>

//           {cart.length === 0 ? (
//             <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
//               سبد خرید خالی است.
//             </p>
//           ) : (
//             <div className="space-y-2">
//               {cart.map((item) => (
//                 <article
//                   key={item.id}
//                   className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
//                 >
//                   <div className="flex items-center justify-between gap-3">
//                     <p className="font-semibold text-slate-900">{item.title}</p>
//                     <p className="text-slate-500">× {item.quantity}</p>
//                   </div>

//                   <div className="mt-1 flex items-center justify-between gap-3 text-xs">
//                     <div className="flex items-center gap-2 text-slate-600">
//                       <span>قیمت واحد:</span>
//                       <span className="font-semibold text-slate-700">
//                         {formatPrice(item.discountPrice ?? item.price)} تومان
//                       </span>
//                       {typeof item.discountPrice === "number" &&
//                         item.discountPrice < item.price && (
//                           <span className="text-slate-400 line-through">
//                             {formatPrice(item.price)} تومان
//                           </span>
//                         )}
//                     </div>
//                     <span className="font-semibold text-slate-900">
//                       {formatPrice(
//                         (item.discountPrice ?? item.price) * item.quantity,
//                       )}{" "}
//                       تومان
//                     </span>
//                   </div>
//                   {item.variantTitle && (
//                     <p className="mt-1 text-xs text-slate-500">
//                       مدل انتخابی: {item.variantTitle}
//                     </p>
//                   )}
//                 </article>
//               ))}
//             </div>
//           )}
//         </section>

//         <aside className="space-y-4 lg:col-span-2">
//           <div className="rounded-2xl border border-slate-200 p-4">
//             <h3 className="mb-2 text-sm font-bold text-slate-800">
//               آدرس ارسال
//             </h3>

//             <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
//               <MapPin className="h-4 w-4 text-cyan-700" />
//               {selectedAddress.province}، {selectedAddress.city}
//             </p>

//             <p className="mt-2 text-sm text-slate-600">
//               {selectedAddress.address}
//               {selectedAddress.plaque ? `، پلاک ${selectedAddress.plaque}` : ""}
//               {selectedAddress.unit ? `، واحد ${selectedAddress.unit}` : ""}
//             </p>

//             <p className="mt-1 text-xs text-slate-500">
//               کد پستی: {selectedAddress.postalCode}
//             </p>
//           </div>

//           <div className="rounded-2xl border border-slate-200 p-4 text-sm">
//             <div className="flex items-center justify-between text-slate-600">
//               <span>جمع کالاها</span>
//               <span>{formatPrice(orderSummary.subtotal)} تومان</span>
//             </div>

//             <div className="mt-2 flex items-center justify-between text-emerald-700">
//               <span>تخفیف</span>
//               <span>{formatPrice(orderSummary.discount)} تومان</span>
//             </div>

//             <div className="mt-2 flex items-center justify-between text-slate-600">
//               <span>هزینه ارسال</span>
//               <span>{formatPrice(shippingCost)} تومان</span>
//             </div>

//             <div className="mt-3 border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
//               <div className="flex items-center justify-between">
//                 <span>قابل پرداخت</span>
//                 <span className="text-cyan-700">
//                   {formatPrice(orderSummary.final)} تومان
//                 </span>
//               </div>
//             </div>
//           </div>
//         </aside>
//       </div>

//       <button
//         type="button"
//         onClick={submitOrder}
//         disabled={loading || cart.length === 0}
//         className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
//       >
//         {loading ? (
//           <>
//             <Loader2 className="h-4 w-4 animate-spin" />
//             در حال اتصال به درگاه...
//           </>
//         ) : (
//           <>
//             <CreditCard className="h-4 w-4" />
//             پرداخت و تکمیل سفارش
//             <ArrowLeft className="h-4 w-4" />
//           </>
//         )}
//       </button>
//     </div>
//   );
// }

// بعد از chat
"use client";

import { formatPrice } from "@/helpers/Price";
import useCartStore from "@/stores/cartStore";
import { Address } from "@/types";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

interface PaymentFormProps {
  selectedAddress: Address;
}

interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

export default function PaymentForm({ selectedAddress }: PaymentFormProps) {
  const { cart, clearCart } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const shippingCost = 0;

  // ── کیف پول ──
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ── کوپن ──
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(
    null,
  );
  const [couponLoading, setCouponLoading] = useState(false);

  useEffect(() => {
    fetch("/api/wallet")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.ok && typeof json.data?.balance === "number") {
          setWalletBalance(json.data.balance);
        }
      })
      .catch(() => {});
  }, []);

  const orderSummary = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const discount = cart.reduce(
      (sum, item) =>
        sum + (item.price - (item.discountPrice ?? item.price)) * item.quantity,
      0,
    );

    const couponDiscount = appliedCoupon?.discountAmount ?? 0;

    return {
      subtotal,
      discount,
      couponDiscount,
      final: Math.max(0, subtotal - discount - couponDiscount + shippingCost),
    };
  }, [cart, appliedCoupon]);

  const applyCouponCode = async () => {
    const code = couponInput.trim();
    if (!code || couponLoading) return;

    setCouponLoading(true);
    try {
      const res = await fetch("/api/loyalty/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "کد تخفیف معتبر نیست");
      }

      setAppliedCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
      });
      toast.success(
        `کد تخفیف اعمال شد — ${formatPrice(data.discountAmount)} تومان`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در اعمال کد");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  const buildPayload = () => ({
    addressId: selectedAddress._id,
    shippingCost,
    couponCode: appliedCoupon?.code,
    items: cart.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  });

  const submitOrder = async () => {
    if (cart.length === 0 || loading || walletLoading) return;

    setLoading(true);

    try {
      const paymentResponse = await fetch("/api/payment-zarinpal/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(buildPayload()),
      });

      const paymentData = await paymentResponse.json().catch(() => ({}));

      if (!paymentResponse.ok || !paymentData.success || !paymentData.url) {
        throw new Error(paymentData.error || "PAYMENT_REQUEST_FAILED");
      }

      toast.success("در حال انتقال به درگاه پرداخت...");
      // clearCart();
      router.push(paymentData.url);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "ایجاد سفارش یا اتصال به درگاه پرداخت ناموفق بود.";

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const payWithWallet = async () => {
    if (cart.length === 0 || loading || walletLoading) return;

    setWalletLoading(true);

    try {
      const res = await fetch("/api/payment-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || "پرداخت با کیف پول ناموفق بود");
      }

      toast.success("پرداخت با کیف پول با موفقیت انجام شد");
      clearCart();
      router.push(`/payment-success?orderId=${data.orderId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "پرداخت با کیف پول ناموفق بود",
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const canPayWithWallet =
    walletBalance !== null && walletBalance >= orderSummary.final;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            مرور نهایی و پرداخت
          </h2>
          <p className="text-sm text-slate-500">
            اطلاعات سفارش را بررسی کنید و سپس وارد درگاه شوید.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          روش پرداخت: درگاه امن زرین‌پال یا کیف پول
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 p-4 lg:col-span-3">
          <h3 className="mb-3 text-sm font-bold text-slate-800">اقلام سفارش</h3>

          {cart.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              سبد خرید خالی است.
            </p>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-slate-500">× {item.quantity}</p>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span>قیمت واحد:</span>
                      <span className="font-semibold text-slate-700">
                        {formatPrice(item.discountPrice ?? item.price)} تومان
                      </span>
                      {typeof item.discountPrice === "number" &&
                        item.discountPrice < item.price && (
                          <span className="text-slate-400 line-through">
                            {formatPrice(item.price)} تومان
                          </span>
                        )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(
                        (item.discountPrice ?? item.price) * item.quantity,
                      )}{" "}
                      تومان
                    </span>
                  </div>
                  {item.variantTitle && (
                    <p className="mt-1 text-xs text-slate-500">
                      مدل انتخابی: {item.variantTitle}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-2 text-sm font-bold text-slate-800">
              آدرس ارسال
            </h3>

            <p className="flex items-center gap-1 text-sm font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-cyan-700" />
              {selectedAddress.province}، {selectedAddress.city}
            </p>

            <p className="mt-2 text-sm text-slate-600">
              {selectedAddress.address}
              {selectedAddress.plaque ? `، پلاک ${selectedAddress.plaque}` : ""}
              {selectedAddress.unit ? `، واحد ${selectedAddress.unit}` : ""}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              کد پستی: {selectedAddress.postalCode}
            </p>
          </div>

          {/* کد تخفیف */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
              <Ticket className="h-4 w-4 text-indigo-600" />
              کد تخفیف
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                <span className="font-semibold text-emerald-700">
                  {appliedCoupon.code} — {formatPrice(appliedCoupon.discountAmount)} تومان تخفیف
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  aria-label="حذف کد تخفیف"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="کد تخفیف را وارد کنید"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={applyCouponCode}
                  disabled={couponLoading || !couponInput.trim()}
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                >
                  {couponLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  اعمال
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>جمع کالاها</span>
              <span>{formatPrice(orderSummary.subtotal)} تومان</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-emerald-700">
              <span>تخفیف</span>
              <span>{formatPrice(orderSummary.discount)} تومان</span>
            </div>

            {orderSummary.couponDiscount > 0 && (
              <div className="mt-2 flex items-center justify-between text-indigo-700">
                <span>کد تخفیف</span>
                <span>{formatPrice(orderSummary.couponDiscount)} تومان</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-slate-600">
              <span>هزینه ارسال</span>
              <span>{formatPrice(shippingCost)} تومان</span>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <div className="flex items-center justify-between">
                <span>قابل پرداخت</span>
                <span className="text-cyan-700">
                  {formatPrice(orderSummary.final)} تومان
                </span>
              </div>
            </div>
          </div>

          {/* موجودی کیف پول */}
          {walletBalance !== null && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <span className="flex items-center gap-1.5 text-slate-600">
                <Wallet className="h-4 w-4 text-cyan-700" />
                موجودی کیف پول
              </span>
              <span className="font-bold text-slate-900">
                {formatPrice(walletBalance)} تومان
              </span>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={submitOrder}
          disabled={loading || walletLoading || cart.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال اتصال به درگاه...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              پرداخت با درگاه زرین‌پال
              <ArrowLeft className="h-4 w-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={payWithWallet}
          disabled={
            loading || walletLoading || cart.length === 0 || !canPayWithWallet
          }
          title={
            !canPayWithWallet && walletBalance !== null
              ? "موجودی کیف پول کافی نیست"
              : undefined
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {walletLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال پرداخت از کیف پول...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" />
              پرداخت با کیف پول
              {walletBalance !== null && !canPayWithWallet && (
                <span className="text-xs opacity-80">(موجودی ناکافی)</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

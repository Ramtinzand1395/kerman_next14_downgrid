
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
import { ButtonLoading } from "@/app/components/loading/LoadingSystem";
import type { ShippingCalculation, ShippingMethod } from "@/lib/shipping";
import { summarizeOrderMoney } from "@/lib/orderSummary";
import OrderMoneySummaryView from "./OrderMoneySummary";

interface PaymentFormProps {
  selectedAddress: Address;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

export interface AppliedCoupon {
  code: string;
  discountAmount: number;
}

export default function PaymentForm({
  selectedAddress,
  appliedCoupon,
  setAppliedCoupon,
}: PaymentFormProps) {
  const { cart, removePurchasedItems } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const [shippingOptions, setShippingOptions] = useState<ShippingCalculation[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] =
    useState<ShippingMethod | null>(null);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [shippingError, setShippingError] = useState("");
  const shippingInfo = shippingOptions.find(
    (option) => option.method === selectedShippingMethod,
  ) || null;
  const shippingCost = shippingInfo?.feeToman ?? 0;

  useEffect(() => {
    let cancelled = false;
    setShippingLoading(true);
    setShippingError("");
    setShippingOptions([]);
    setSelectedShippingMethod(null);
    fetch(`/api/shipping?addressId=${encodeURIComponent(selectedAddress._id)}`)
      .then(async (response) => ({
        response,
        body: await response.json().catch(() => ({})),
      }))
      .then(({ response, body }) => {
        if (cancelled) return;
        if (!response.ok || !body.ok || !Array.isArray(body.data?.options)) {
          throw new Error(body.error || "روش‌های ارسال دریافت نشدند.");
        }
        setShippingOptions(body.data.options);
        setSelectedShippingMethod(body.data.options[0]?.method || null);
      })
      .catch((error) => {
        if (!cancelled) {
          setShippingError(error instanceof Error ? error.message : "روش‌های ارسال دریافت نشدند.");
        }
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAddress._id]);

  // ── کیف پول ──
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // ── کوپن ──
  const [couponInput, setCouponInput] = useState("");
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
    const items = cart.map((item) => ({
      price: item.price,
      discountPrice: item.discountPrice,
      quantity: item.quantity,
      total: (item.discountPrice ?? item.price) * item.quantity,
    }));
    const totalPrice = items.reduce((sum, item) => sum + item.total, 0);
    const couponDiscount = appliedCoupon?.discountAmount ?? 0;

    return summarizeOrderMoney({
      items,
      totalPrice,
      couponDiscount,
      shippingCost,
      finalPrice: Math.max(0, totalPrice - couponDiscount + shippingCost),
    });
  }, [cart, appliedCoupon, shippingCost]);

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
      toast.error(
        error instanceof Error
          ? error.message
          : "کد تخفیف اعمال نشد؛ کد را بررسی و دوباره تلاش کنید.",
      );
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  const cartValidationKey = useMemo(
    () =>
      cart
        .map(
          (item) =>
            `${item.productId}:${item.variantId || ""}:${item.quantity}`,
        )
        .sort()
        .join("|"),
    [cart],
  );

  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
  }, [selectedAddress._id, selectedShippingMethod, cartValidationKey, appliedCoupon?.code]);

  useEffect(() => {
    if (!appliedCoupon?.code) return;
    let cancelled = false;

    fetch("/api/loyalty/coupon/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: appliedCoupon.code,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    })
      .then(async (response) => ({
        response,
        data: await response.json().catch(() => ({})),
      }))
      .then(({ response, data }) => {
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setAppliedCoupon(null);
          toast.info("با تغییر سبد، کد تخفیف دیگر معتبر نبود و از سفارش حذف شد.");
          return;
        }
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAppliedCoupon(null);
          toast.info("اعتبار کد تخفیف تأیید نشد؛ لطفاً دوباره آن را وارد کنید.");
        }
      });

    return () => {
      cancelled = true;
    };
    // cartValidationKey intentionally represents the exact checkout lines.
  }, [appliedCoupon?.code, cart, cartValidationKey, setAppliedCoupon]);

  const buildPayload = () => ({
    addressId: selectedAddress._id,
    shippingMethod: selectedShippingMethod,
    couponCode: appliedCoupon?.code,
    items: cart.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  });

  const redirectToLogin = () => {
    toast.info("نشست کاربری شما منقضی شده است؛ لطفاً دوباره وارد شوید.");
    router.push(
      `/auth/login?callbackUrl=${encodeURIComponent("/cart?step=3")}`,
    );
  };

  const submitOrder = async () => {
    if (cart.length === 0 || loading || walletLoading || !shippingInfo) return;

    setLoading(true);

    try {
      const paymentResponse = await fetch("/api/payment-zarinpal/request", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(buildPayload()),
      });

      const paymentData = await paymentResponse.json().catch(() => ({}));

      if (
        paymentResponse.status === 401 ||
        paymentData.code === "AUTH_REQUIRED"
      ) {
        redirectToLogin();
        return;
      }

      if (!paymentResponse.ok || !paymentData.success || !paymentData.url) {
        throw new Error(paymentData.error || "PAYMENT_REQUEST_FAILED");
      }

      toast.info("در حال انتقال امن به درگاه پرداخت…");
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
    if (cart.length === 0 || loading || walletLoading || !shippingInfo) return;

    setWalletLoading(true);

    try {
      const res = await fetch("/api/payment-wallet", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        redirectToLogin();
        return;
      }

      if (!res.ok || !data.success || !data.orderId) {
        throw new Error(data.error || "پرداخت با کیف پول ناموفق بود");
      }

      toast.success("پرداخت از کیف پول انجام شد؛ سفارش شما ثبت شده است.");
      removePurchasedItems(buildPayload().items);
      router.push(`/payment-success?orderId=${data.orderId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "پرداخت از کیف پول انجام نشد؛ موجودی را بررسی و دوباره تلاش کنید.",
      );
    } finally {
      setWalletLoading(false);
    }
  };

  const canPayWithWallet =
    walletBalance !== null && walletBalance >= orderSummary.payable;

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
                    <p className="font-semibold text-slate-900">{item.productTitle || item.title}</p>
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
                  {item.variantAttributes?.length ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {item.variantAttributes
                        .map((attribute) => `${attribute.label}: ${attribute.optionLabel}`)
                        .join(" · ")}
                    </p>
                  ) : item.variantTitle ? (
                    <p className="mt-1 text-xs text-slate-500">
                      مدل انتخابی: {item.variantTitle}
                    </p>
                  ) : null}
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

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-800">روش ارسال</h3>
            {shippingLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> در حال بررسی محدوده ارسال…
              </p>
            ) : shippingError ? (
              <p className="rounded-xl bg-rose-50 p-3 text-sm leading-6 text-rose-700">
                {shippingError} آدرس را در مرحله قبل بررسی کنید.
              </p>
            ) : (
              <div className="space-y-2">
                {shippingOptions.map((option) => (
                  <label
                    key={option.method}
                    className={`block cursor-pointer rounded-xl border p-3 transition ${
                      selectedShippingMethod === option.method
                        ? "border-cyan-400 bg-cyan-50"
                        : "border-slate-200"
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={option.method}
                        checked={selectedShippingMethod === option.method}
                        onChange={() => setSelectedShippingMethod(option.method)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-bold text-slate-900">
                          {option.title} — {option.feeToman === null ? "پس‌کرایه" : `${formatPrice(option.feeToman)} تومان`}
                        </span>
                        <span className="mt-1 block text-xs leading-6 text-slate-600">
                          {option.description}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
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

          <div className="rounded-2xl border border-slate-200 p-4">
            <OrderMoneySummaryView
              summary={orderSummary}
              shippingLabel={shippingInfo?.label || "پس از انتخاب روش ارسال"}
              shippingNote={shippingInfo?.description}
              compact
            />
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

      <div id="payment-actions" className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={submitOrder}
          disabled={loading || walletLoading || cart.length === 0 || !shippingInfo}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? (
            <ButtonLoading label="در حال اتصال به درگاه…" />
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
            loading || walletLoading || cart.length === 0 || !canPayWithWallet || !shippingInfo
          }
          title={
            !canPayWithWallet && walletBalance !== null
              ? "موجودی کیف پول کافی نیست"
              : undefined
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {walletLoading ? (
            <ButtonLoading label="در حال پرداخت از کیف پول…" />
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

"use client";

import { formatPrice } from "@/helpers/Price";
import useCartStore from "@/stores/cartStore";
import { Address } from "@/types";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CreditCard,
  MapPin,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import PaymentForm, { AppliedCoupon } from "../components/PaymentForm";
import ShippingForm from "../components/ShippingForm";
import { safeParseJSON } from "@/helpers/safeParseJSON";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";
import { CartSkeleton } from "@/app/components/loading/LoadingSystem";
import { calculateShippingInfo } from "@/lib/shipping";
import { summarizeOrderMoney } from "@/lib/orderSummary";
import OrderMoneySummaryView from "../components/OrderMoneySummary";
import { formatLocalShippingPolicyText, type StoreShippingSettings } from "@/lib/shipping";

const checkoutSteps = [
  {
    id: 1,
    title: "مرور سبد خرید",
    subtitle: "بررسی و ویرایش محصولات",
    icon: ShoppingBag,
  },
  {
    id: 2,
    title: "آدرس تحویل",
    subtitle: "ثبت یا انتخاب آدرس",
    icon: MapPin,
  },
  {
    id: 3,
    title: "پرداخت",
    subtitle: "نهایی‌سازی سفارش",
    icon: CreditCard,
  },
] as const;

export default function CartPage({ shippingSettings }: { shippingSettings: StoreShippingSettings }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressHydrated, setAddressHydrated] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const { cart, hasHydrated, removeFromCart, increaseQty, decreaseQty } = useCartStore();
  const couponCartKey = useMemo(
    () =>
      cart
        .map(
          (item) =>
            `${item.id}:${item.quantity}:${item.price}:${item.discountPrice ?? ""}`,
        )
        .sort()
        .join("|"),
    [cart],
  );
  const previousCouponCartKeyRef = useRef(couponCartKey);

  const activeStep = useMemo(() => {
    const step = Number(searchParams.get("step") ?? "1");
    if (Number.isNaN(step) || step < 1 || step > 3) {
      return 1;
    }
    return step;
  }, [searchParams]);

  const shippingInfo = useMemo(() => {
    if (!selectedAddress?.city || !selectedAddress?.province) return null;
    try {
      return calculateShippingInfo({
        province: selectedAddress.province,
        city: selectedAddress.city,
        postalCode: selectedAddress.postalCode,
      }, undefined, shippingSettings);
    } catch {
      return null;
    }
  }, [selectedAddress, shippingSettings]);

  const orderSummary = useMemo(() => {
    const items = cart.map((item) => ({
      price: item.price,
      discountPrice: item.discountPrice,
      quantity: item.quantity,
      total: (item.discountPrice ?? item.price) * item.quantity,
    }));
    const totalPrice = items.reduce((sum, item) => sum + item.total, 0);
    const shippingCost = shippingInfo?.feeToman ?? 0;
    const couponDiscount = appliedCoupon?.discountAmount ?? 0;

    return summarizeOrderMoney({
      items,
      totalPrice,
      couponDiscount,
      shippingCost,
      finalPrice: Math.max(0, totalPrice - couponDiscount + shippingCost),
    });
  }, [cart, shippingInfo, appliedCoupon]);

  useEffect(() => {
    if (previousCouponCartKeyRef.current === couponCartKey) return;

    previousCouponCartKeyRef.current = couponCartKey;
    setAppliedCoupon(null);
  }, [couponCartKey]);

  useEffect(() => {
    const cached = sessionStorage.getItem("checkout:selected-address");
    if (!cached) {
      setAddressHydrated(true);
      return;
    }

    const parsedAddress = safeParseJSON<Address>(cached);
    if (!parsedAddress) {
      sessionStorage.removeItem("checkout:selected-address");
      setAddressHydrated(true);
      return;
    }
    setSelectedAddress(parsedAddress);
    setAddressHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !addressHydrated) return;
    if (activeStep > 1 && cart.length === 0) {
      router.replace("/cart?step=1", { scroll: false });
      return;
    }
    if (activeStep === 3 && !selectedAddress) {
      router.replace("/cart?step=2", { scroll: false });
    }
  }, [activeStep, addressHydrated, cart.length, hasHydrated, router, selectedAddress]);

  useEffect(() => {
    if (!selectedAddress) {
      sessionStorage.removeItem("checkout:selected-address");
      return;
    }

    sessionStorage.setItem(
      "checkout:selected-address",
      JSON.stringify(selectedAddress),
    );
  }, [selectedAddress]);

  const goToStep = (step: number) => {
    if (step > 1 && cart.length === 0) {
      router.push("/cart?step=1", { scroll: false });
      return;
    }

    if (step === 3 && !selectedAddress) {
      router.push("/cart?step=2", { scroll: false });
      return;
    }

    router.push(`/cart?step=${step}`, { scroll: false });
  };

  if (!hasHydrated) return <CartSkeleton />;

  return (
    <main className="mx-auto mt-6 w-full max-w-7xl px-4 pb-36 md:mt-10 xl:pb-16">
      <section className="overflow-hidden rounded-3xl bg-blue-900 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">سبد خرید</h1>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
            <p>تعداد کالا: {orderSummary.itemCount}</p>
            <p className="mt-1 font-semibold">
              {activeStep === 3
                ? "مبلغ نهایی پس از انتخاب روش ارسال"
                : `پرداخت برآوردی: ${formatPrice(orderSummary.payable)} تومان`}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          {checkoutSteps.map((step) => {
            const StepIcon = step.icon;
            const isActive = activeStep === step.id;
            const isCompleted = activeStep > step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`rounded-2xl border p-4 text-right transition ${
                  isActive
                    ? "border-cyan-300 bg-cyan-300/15"
                    : "border-white/15 bg-white/5 hover:border-white/35"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-300"
                        : isActive
                          ? "bg-cyan-400/20 text-cyan-300"
                          : "bg-white/10 text-slate-200"
                    }`}
                  >
                    {isCompleted ? (
                      <CircleCheck className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>

                  <span className="text-xs text-slate-300">
                    مرحله {step.id}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold md:text-base">
                  {step.title}
                </p>
                <p className="mt-1 text-xs text-slate-300">{step.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          {activeStep === 1 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="mb-5 space-y-2 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-6 text-slate-700">
                {shippingSettings.localDelivery.enabled && <p>{formatLocalShippingPolicyText(shippingSettings.localDelivery.feeToman)}</p>}
                {shippingSettings.nationalCollect.enabled && <p>{shippingSettings.nationalCollect.description}</p>}
              </div>
              <h2 className="mb-5 text-lg font-bold text-slate-900">
                محصولات انتخاب‌شده
              </h2>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="font-medium text-slate-800">
                    سبد خرید شما خالی است.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    برای شروع خرید، محصول موردنظر خود را اضافه کنید.
                  </p>

                  <Link
                    href="/products"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    مشاهده محصولات
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <ProductImage
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="80px"
                              className="object-contain p-1"
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900 md:text-base">
                              {item.productTitle || item.title}
                            </h3>
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
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="text-slate-500">قیمت واحد:</span>
                              <span className="font-semibold text-slate-700">
                                {formatPrice(item.discountPrice ?? item.price)}
                                تومان
                              </span>
                              {typeof item.discountPrice === "number" &&
                                item.discountPrice < item.price && (
                                  <span className="text-slate-400 line-through">
                                    {formatPrice(item.price)} تومان
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <div className="flex items-center rounded-full border border-slate-200 bg-white p-1">
                            <button
                              type="button"
                              onClick={() => decreaseQty(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                            >
                              -
                            </button>

                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  typeof item.stock === "number" &&
                                  item.quantity >= item.stock
                                ) {
                                  toast.warning(
                                    "تعداد انتخابی بیشتر از موجودی فعلی است؛ تعداد را کاهش دهید.",
                                  );
                                  return;
                                }
                                increaseQty(item.id);
                              }}
                              disabled={
                                typeof item.stock === "number" &&
                                item.quantity >= item.stock
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-sm font-bold text-slate-900">
                            {formatPrice(
                              (item.discountPrice ?? item.price) *
                                item.quantity,
                            )}{" "}
                            تومان
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (activeStep === 1 && index === 0) {
                                const ok = confirm("از حذف محصول مطمعن هستید؟");
                                if (!ok) return;
                              }

                              removeFromCart(item);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                            title="حذف از سبد خرید"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeStep === 2 && (
            <ShippingForm
              selectedAddress={selectedAddress}
              setSelectedAddress={(address) => setSelectedAddress(address)}
            />
          )}

          {activeStep === 3 &&
            (selectedAddress ? (
              <PaymentForm
                selectedAddress={selectedAddress}
                appliedCoupon={appliedCoupon}
                setAppliedCoupon={setAppliedCoupon}
              />
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
                برای ورود به مرحله پرداخت، ابتدا آدرس تحویل را انتخاب کنید.
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="mr-3 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold"
                >
                  رفتن به مرحله آدرس
                </button>
              </div>
            ))}
        </div>

        <aside className="xl:col-span-4">
          <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-bold text-slate-900">خلاصه سفارش</h2>

            <p className="mt-2 text-xs text-slate-500">
              {orderSummary.itemCount.toLocaleString("fa-IR")} قلم کالا
            </p>
            <div className="my-5">
              {activeStep === 3 ? (
                <p className="rounded-xl bg-cyan-50 p-3 text-xs leading-6 text-cyan-900">
                  مبلغ نهایی پس از انتخاب روش ارسال در فرم پرداخت نمایش داده می‌شود.
                </p>
              ) : (
                <OrderMoneySummaryView
                  summary={orderSummary}
                  shippingLabel={
                    selectedAddress && shippingInfo
                      ? shippingInfo.label
                      : "محاسبه بر اساس آدرس"
                  }
                  shippingNote={shippingInfo?.description}
                  compact
                />
              )}
            </div>

            <div className="space-y-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => goToStep(activeStep - 1)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  بازگشت به مرحله قبل
                </button>
              )}

              {activeStep < 3 && (
                <button
                  type="button"
                  onClick={() => goToStep(activeStep + 1)}
                  disabled={
                    (activeStep === 1 && cart.length === 0) ||
                    (activeStep === 2 && !selectedAddress)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  ادامه
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </aside>
      </section>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-blue-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_35px_rgba(15,23,42,0.12)] backdrop-blur xl:hidden">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-slate-500">{activeStep === 3 ? "جمع نهایی" : "مبلغ قابل پرداخت"}</p>
              <p className="truncate text-base font-black text-blue-900">
                {activeStep === 3 ? "در فرم پرداخت" : `${formatPrice(orderSummary.payable)} تومان`}
              </p>
            </div>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => goToStep(activeStep - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700"
                aria-label="بازگشت به مرحله قبل"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              disabled={activeStep === 2 && !selectedAddress}
              onClick={() => {
                if (activeStep < 3) {
                  goToStep(activeStep + 1);
                  return;
                }
                document
                  .getElementById("payment-actions")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="min-w-40 rounded-xl bg-blue-900 px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              {activeStep === 3 ? "انتخاب روش پرداخت" : "ادامه فرایند خرید"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

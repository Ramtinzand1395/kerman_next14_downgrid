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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PaymentForm from "../components/PaymentForm";
import ShippingForm from "../components/ShippingForm";

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

export default function CartPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const { cart, removeFromCart, increaseQty, decreaseQty } = useCartStore();

  const activeStep = useMemo(() => {
    const step = Number(searchParams.get("step") ?? "1");
    if (Number.isNaN(step) || step < 1 || step > 3) {
      return 1;
    }
    return step;
  }, [searchParams]);

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

    return {
      itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      discount,
      final: subtotal - discount,
    };
  }, [cart]);

  useEffect(() => {
    const cached = sessionStorage.getItem("checkout:selected-address");
    if (!cached) return;

    try {
      setSelectedAddress(JSON.parse(cached));
    } catch {
      sessionStorage.removeItem("checkout:selected-address");
    }
  }, []);

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

  return (
    <main className="mx-auto mt-6 w-full max-w-7xl px-4 pb-16 md:mt-10">
      <section className="overflow-hidden rounded-3xl bg-blue-900 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs text-slate-300">Checkout</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">سبد خرید</h1>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
            <p>تعداد کالا: {orderSummary.itemsCount}</p>
            <p className="mt-1 font-semibold">
              پرداخت نهایی: {formatPrice(orderSummary.final)} تومان
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
                  {cart.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              className="object-contain p-1"
                            />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900 md:text-base">
                              {item.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              قیمت واحد:{" "}
                              {formatPrice(item.discountPrice ?? item.price)}{" "}
                              تومان
                            </p>
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
                              onClick={() => increaseQty(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
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
                            onClick={() => removeFromCart(item)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                            title="حذف از سبد خرید"
                          >
                            <span className="text-base">🗑</span>
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
              <PaymentForm selectedAddress={selectedAddress} />
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

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>تعداد کل اقلام</span>
                <span className="font-semibold text-slate-900">
                  {orderSummary.itemsCount}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>جمع کالاها</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(orderSummary.subtotal)} تومان
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>تخفیف شما</span>
                <span className="font-semibold text-emerald-700">
                  {formatPrice(orderSummary.discount)} تومان
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  مبلغ قابل پرداخت
                </span>
                <span className="text-lg font-extrabold text-cyan-700">
                  {formatPrice(orderSummary.final)} تومان
                </span>
              </div>
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
    </main>
  );
}

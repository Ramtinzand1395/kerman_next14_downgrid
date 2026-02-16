"use client";

import { formatPrice } from "@/helpers/Price";
import useCartStore from "@/stores/cartStore";
import { Address } from "@/types";
import { ArrowLeft, CreditCard, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

interface PaymentFormProps {
  selectedAddress: Address;
}

export default function PaymentForm({ selectedAddress }: PaymentFormProps) {
  const { cart, clearCart } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const shippingCost = 0;

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
      subtotal,
      discount,
      final: subtotal - discount + shippingCost,
    };
  }, [cart]);

  const submitOrder = async () => {
    if (cart.length === 0 || loading) return;

    setLoading(true);

    try {
      const createOrderResponse = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddress._id,
          shippingCost,
          items: cart.map((item) => ({
            productId: item.id,
            price: item.discountPrice ?? item.price,
            quantity: item.quantity,
          })),
        }),
      });

      if (!createOrderResponse.ok) {
        throw new Error("ORDER_CREATE_FAILED");
      }

      const order = await createOrderResponse.json();

      const paymentResponse = await fetch("/api/payment-zarinpal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order._id,
          items: cart.map((item) => item.id),
          finalPrice: orderSummary.final,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok || !paymentData.success || !paymentData.url) {
        throw new Error("PAYMENT_REQUEST_FAILED");
      }

      toast.success("در حال انتقال به درگاه پرداخت...");
      clearCart();
      router.push(paymentData.url);
    } catch {
      toast.error("ایجاد سفارش یا اتصال به درگاه پرداخت ناموفق بود.");
    } finally {
      setLoading(false);
    }
  };

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
          روش پرداخت: درگاه امن زرین‌پال
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

                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      قیمت واحد: {formatPrice(item.discountPrice ?? item.price)}{" "}
                      تومان
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(
                        (item.discountPrice ?? item.price) * item.quantity,
                      )}{" "}
                      تومان
                    </span>
                  </div>
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

          <div className="rounded-2xl border border-slate-200 p-4 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>جمع کالاها</span>
              <span>{formatPrice(orderSummary.subtotal)} تومان</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-emerald-700">
              <span>تخفیف</span>
              <span>{formatPrice(orderSummary.discount)} تومان</span>
            </div>

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
        </aside>
      </div>

      <button
        type="button"
        onClick={submitOrder}
        disabled={loading || cart.length === 0}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال اتصال به درگاه...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            پرداخت و تکمیل سفارش
            <ArrowLeft className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

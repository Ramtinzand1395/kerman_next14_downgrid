"use client";
import useCartStore from "@/stores/cartStore";
import { formatPrice } from "@/helpers/Price";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function PaymentForm({ selectedAddress }) {
  const { cart, clearCart } = useCartStore();

  const shippingCost = 0;

  const total = cart.reduce((a, i) => a + i.price * i.quantity, 0);
  const discount = cart.reduce(
    (a, i) => a + (i.price - (i.discountPrice ?? i.price)) * i.quantity,
    0
  );
  const final = total - discount + shippingCost;
  const [Loading, setLoading] = useState(false);
  const submitOrder = async () => {
    setLoading(true);

    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addressId: selectedAddress,
        shippingCost,
        items: cart.map((i) => ({
          productId: i.id,
          price: i.discountPrice ?? i.price,
          quantity: i.quantity,
        })),
      }),
    });

    if (!res.ok) throw new Error();
    toast.success("سفارش با موفقیت ذخیره شد");
    clearCart();
    // const pay = await fetch("/api/payment/request", {
    //   method: "POST",
    //   body: JSON.stringify({ orderId: order._id })
    // });

    // const { url } = await pay.json();
    // window.location.href = url;
  };
  return (
    <div className="max-w-5xl mx-auto mt-10 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-gray-800">
          پیش‌فاکتور سفارش
        </h1>

        {/* ITEMS */}
        <div className="space-y-4 mb-10">
          {cart.map((i) => (
            <div
              key={i.id}
              className="flex flex-col md:flex-row items-center justify-between border rounded-xl p-4 hover:shadow transition"
            >
              <div className="font-medium">{i.title}</div>
              <div className="flex gap-4 text-sm mt-2 md:mt-0">
                <span>تعداد: {i.quantity}</span>
                <span>قیمت: {formatPrice(i.discountPrice ?? i.price)}</span>
                <span className="font-semibold text-green-600">
                  جمع: {formatPrice((i.discountPrice ?? i.price) * i.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* TOTALS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t pt-6">
          <div className="flex justify-between">
            <span>جمع کالاها</span>
            <span>{formatPrice(total)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>تخفیف</span>
            <span>-{formatPrice(discount)}</span>
          </div>
          <div className="flex justify-between">
            <span>هزینه ارسال</span>
            <span>{formatPrice(shippingCost)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>مبلغ نهایی</span>
            <span className="text-green-600">{formatPrice(final)}</span>
          </div>
        </div>

        {/* ACTION */}
        <button
          onClick={() => submitOrder()}
          className="mt-10 w-full bg-blue-600 hover:bg-blue-700 transition text-white py-4 rounded-xl text-lg flex justify-center items-center gap-2"
        >
          {Loading ? "در حال انتقال به درگاه پرداخت" : "   ادامه به پرداخت"}
          <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  );
}

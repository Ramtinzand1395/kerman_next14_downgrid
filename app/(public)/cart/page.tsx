"use client";

import useCartStore from "@/stores/cartStore";
import { ArrowLeft, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import PaymentForm from "../components/PaymentForm";
import ShippingForm from "../components/ShippingForm";
import { formatPrice } from "@/helpers/Price";
import { Address } from "@/types";
// todo
// کم کردن ایتم ها از لیست
const steps = [
  {
    id: 1,
    title: "سبد خرید ",
  },
  {
    id: 2,
    title: "آدرس",
  },
  {
    id: 3,
    title: "پرداخت ",
  },
];
const CartPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  // const [form, setForm] = useState({
  //   province: "",
  //   city: "",
  //   address: "",
  //   plaque: "",
  //   unit: "",
  //   postalCode: "",
  //   receiverName: "",
  //   receiverPhone: "",
  // });
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const activeStep = parseInt(searchParams.get("step") || "1");

  const { cart, removeFromCart, increaseQty, decreaseQty } = useCartStore();
  return (
    <div className="flex flex-col gap-8 mx-0 md:container md:mx-auto mt-12 min-h-[50vh]">
      {/* STEPS */}
      <div className="flex  items-start gap-8 lg:gap-16">
        {steps.map((step) => (
          <div
            className={`flex items-center gap-2 border-b-2 pb-4 ${
              step.id === activeStep ? "border-blue-800" : "border-gray-200"
            }`}
            key={step.id}
          >
            <div
              className={`w-6 h-6 rounded-full text-white p-4 flex items-center justify-center ${
                step.id === activeStep ? "bg-blue-800" : "bg-gray-400"
              }`}
            >
              {step.id}
            </div>
            <p
              className={`text-sm font-medium ${
                step.id === activeStep ? "text-blue-800" : "text-gray-400"
              }`}
            >
              {step.title}
            </p>
          </div>
        ))}
      </div>
      {/* STEPS & DETAILS */}
      <div className="w-full flex flex-col lg:flex-row gap-16">
        {/* STEPS */}
        <div className="w-full lg:w-9/12 shadow-lg border-1 border-gray-100 p-8 rounded-lg flex flex-col gap-8">
          {activeStep === 1 ? (
            cart.map((item) => (
              // SINGLE CART ITEM
              <div className="flex items-center justify-between">
                {/* IMAGE AND DETAILS */}
                <div className="flex gap-8">
                  {/* IMAGE */}
                  <div className="relative w-32 h-12 bg-gray-50 rounded-lg overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {/* ITEM DETAILS */}
                  <div className="flex flex-col justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-500">
                          تعداد: {item.quantity}
                        </p>
                        <button
                          onClick={() => decreaseQty(item.id)}
                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
                        >
                          -
                        </button>

                        <span className="text-sm w-6 text-center">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQty(item.id)}
                          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* DELETE BUTTON */}
                <div className="flex items-center">
                  <span>{formatPrice(item.price)} تومان</span>

                  <button
                    title="حذف از سبد خرید"
                    onClick={() => removeFromCart(item)}
                    className="w-8 h-8 mr-5 rounded-full bg-red-100 hover:bg-red-200 transition-all duration-300 text-red-400 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : activeStep === 2 ? (
            <ShippingForm
              selectedAddress={selectedAddress}
              setSelectedAddress={setSelectedAddress}
            />
          ) : activeStep === 3 && selectedAddress ? (
            <PaymentForm selectedAddress={selectedAddress} />
          ) : (
            <p className="text-sm text-gray-500">مراحل قبل را تکمیل کنید.</p>
          )}
        </div>
        {/* DETAILS */}
        <div className="w-full lg:w-3/12 shadow-lg border-1 border-gray-100 p-8 rounded-lg flex flex-col gap-8 h-max">
          <h2 className="font-semibold">سبد خرید </h2>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-sm">
              <p className="text-gray-500">مبلغ کالا ها</p>
              <p className="font-medium">
                تومان
                {formatPrice(
                  cart.reduce(
                    (acc, item) => acc + item.price * item.quantity,
                    0
                  )
                )}
              </p>
            </div>
            <div className="flex justify-between text-sm">
              <p className="text-gray-500">تخفیف کل</p>
              <p className="font-medium">
                تومان
                {formatPrice(
                  cart.reduce(
                    (acc, item) =>
                      acc +
                      (item.price - (item.discountPrice ?? item.price)) *
                        item.quantity,
                    0
                  )
                )}
              </p>
            </div>

            <hr className="border-gray-200" />
            <div className="flex justify-between">
              <p className="text-gray-800 font-semibold">مجموع</p>
              <p className="font-medium">
                تومان
                {formatPrice(
                  cart.reduce(
                    (acc, item) =>
                      acc + (item.discountPrice ?? item.price) * item.quantity,
                    0
                  )
                )}
              </p>
            </div>
          </div>
          {activeStep === 1 && (
            <button
              onClick={() => router.push("/cart?step=2", { scroll: false })}
              className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2"
            >
              ادامه
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;

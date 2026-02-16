// // "use client";

// // import useCartStore from "@/stores/cartStore";
// // import { ArrowLeft, Trash2 } from "lucide-react";
// // import Image from "next/image";
// // import { useRouter, useSearchParams } from "next/navigation";
// // import { useState } from "react";
// // import PaymentForm from "../components/PaymentForm";
// // import ShippingForm from "../components/ShippingForm";
// // import { formatPrice } from "@/helpers/Price";
// // import { Address } from "@/types";

// // const steps = [
// //   {
// //     id: 1,
// //     title: "سبد خرید ",
// //   },
// //   {
// //     id: 2,
// //     title: "آدرس",
// //   },
// //   {
// //     id: 3,
// //     title: "پرداخت ",
// //   },
// // ];
// // const CartPage = () => {
// //   const searchParams = useSearchParams();
// //   const router = useRouter();

// //   const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

// //   const activeStep = parseInt(searchParams.get("step") || "1");

// //   const { cart, removeFromCart, increaseQty, decreaseQty } = useCartStore();
// //   return (
// //     <div className="flex flex-col gap-8 mx-0 md:container md:mx-auto mt-12 min-h-[50vh]">
// //       {/* STEPS */}
// //       <div className="flex  items-start gap-8 lg:gap-16">
// //         {steps.map((step) => (
// //           <div
// //             className={`flex items-center gap-2 border-b-2 pb-4 ${
// //               step.id === activeStep ? "border-blue-800" : "border-gray-200"
// //             }`}
// //             key={step.id}
// //           >
// //             <div
// //               className={`w-6 h-6 rounded-full text-white p-4 flex items-center justify-center ${
// //                 step.id === activeStep ? "bg-blue-800" : "bg-gray-400"
// //               }`}
// //             >
// //               {step.id}
// //             </div>
// //             <p
// //               className={`text-sm font-medium ${
// //                 step.id === activeStep ? "text-blue-800" : "text-gray-400"
// //               }`}
// //             >
// //               {step.title}
// //             </p>
// //           </div>
// //         ))}
// //       </div>
// //       {/* STEPS & DETAILS */}
// //       <div className="w-full flex flex-col lg:flex-row gap-16">
// //         {/* STEPS */}
// //         <div className="w-full lg:w-9/12 shadow-lg border-1 border-gray-100 p-8 rounded-lg flex flex-col gap-8">
// //           {activeStep === 1 ? (
// //             cart.map((item) => (
// //               // SINGLE CART ITEM
// //               <div className="flex items-center justify-between">
// //                 {/* IMAGE AND DETAILS */}
// //                 <div className="flex gap-8">
// //                   {/* IMAGE */}
// //                   <div className="relative w-32 h-12 bg-gray-50 rounded-lg overflow-hidden">
// //                     <Image
// //                       src={item.image}
// //                       alt={item.title}
// //                       fill
// //                       className="object-contain"
// //                     />
// //                   </div>
// //                   {/* ITEM DETAILS */}
// //                   <div className="flex flex-col justify-between">
// //                     <div className="flex flex-col gap-1">
// //                       <p className="text-sm font-medium">{item.title}</p>
// //                       <div className="flex items-center gap-2 mt-1">
// //                         <p className="text-xs text-gray-500">
// //                           تعداد: {item.quantity}
// //                         </p>
// //                         <button
// //                           onClick={() => decreaseQty(item.id)}
// //                           className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
// //                         >
// //                           -
// //                         </button>

// //                         <span className="text-sm w-6 text-center">
// //                           {item.quantity}
// //                         </span>

// //                         <button
// //                           onClick={() => increaseQty(item.id)}
// //                           className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 text-sm flex items-center justify-center"
// //                         >
// //                           +
// //                         </button>
// //                       </div>
// //                     </div>
// //                   </div>
// //                 </div>
// //                 {/* DELETE BUTTON */}
// //                 <div className="flex items-center">
// //                   <span>{formatPrice(item.price)} تومان</span>

// //                   <button
// //                     title="حذف از سبد خرید"
// //                     onClick={() => removeFromCart(item)}
// //                     className="w-8 h-8 mr-5 rounded-full bg-red-100 hover:bg-red-200 transition-all duration-300 text-red-400 flex items-center justify-center cursor-pointer"
// //                   >
// //                     <Trash2 className="w-3 h-3" />
// //                   </button>
// //                 </div>
// //               </div>
// //             ))
// //           ) : activeStep === 2 ? (
// //             <ShippingForm
// //               selectedAddress={selectedAddress}
// //               setSelectedAddress={setSelectedAddress}
// //             />
// //           ) : activeStep === 3 && selectedAddress ? (
// //             <PaymentForm selectedAddress={selectedAddress} />
// //           ) : (
// //             <p className="text-sm text-gray-500">مراحل قبل را تکمیل کنید.</p>
// //           )}
// //         </div>
// //         {/* DETAILS */}
// //         <div className="w-full lg:w-3/12 shadow-lg border-1 border-gray-100 p-8 rounded-lg flex flex-col gap-8 h-max">
// //           <h2 className="font-semibold">سبد خرید </h2>
// //           <div className="flex flex-col gap-4">
// //             <div className="flex justify-between text-sm">
// //               <p className="text-gray-500">مبلغ کالا ها</p>
// //               <p className="font-medium">
// //                 تومان
// //                 {formatPrice(
// //                   cart.reduce(
// //                     (acc, item) => acc + item.price * item.quantity,
// //                     0
// //                   )
// //                 )}
// //               </p>
// //             </div>
// //             <div className="flex justify-between text-sm">
// //               <p className="text-gray-500">تخفیف کل</p>
// //               <p className="font-medium">
// //                 تومان
// //                 {formatPrice(
// //                   cart.reduce(
// //                     (acc, item) =>
// //                       acc +
// //                       (item.price - (item.discountPrice ?? item.price)) *
// //                         item.quantity,
// //                     0
// //                   )
// //                 )}
// //               </p>
// //             </div>

// //             <hr className="border-gray-200" />
// //             <div className="flex justify-between">
// //               <p className="text-gray-800 font-semibold">مجموع</p>
// //               <p className="font-medium">
// //                 تومان
// //                 {formatPrice(
// //                   cart.reduce(
// //                     (acc, item) =>
// //                       acc + (item.discountPrice ?? item.price) * item.quantity,
// //                     0
// //                   )
// //                 )}
// //               </p>
// //             </div>
// //           </div>
// //           {activeStep === 1 && (
// //             <button
// //               onClick={() => router.push("/cart?step=2", { scroll: false })}
// //               className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white p-2 rounded-lg cursor-pointer flex items-center justify-center gap-2"
// //             >
// //               ادامه
// //               <ArrowLeft className="w-3 h-3" />
// //             </button>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // };

// // export default CartPage;

// "use client";

// import { formatPrice } from "@/helpers/Price";
// import useCartStore from "@/stores/cartStore";
// import { Address } from "@/types";
// import {
//   ArrowLeft,
//   BadgeCheck,
//   CreditCard,
//   MapPin,
//   Minus,
//   Plus,
//   ShoppingCart,
//   Trash2,
// } from "lucide-react";
// import Image from "next/image";
// import { useRouter, useSearchParams } from "next/navigation";
// import { useMemo, useState } from "react";
// import PaymentForm from "../components/PaymentForm";
// import ShippingForm from "../components/ShippingForm";

// const steps = [
//   { id: 1, title: "سبد خرید", icon: ShoppingCart },
//   { id: 2, title: "آدرس", icon: MapPin },
//   { id: 3, title: "پرداخت", icon: CreditCard },
// ];

// const CartPage = () => {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

//   const { cart, removeFromCart, increaseQty, decreaseQty } = useCartStore();

//   const activeStep = useMemo(() => {
//     const step = Number(searchParams.get("step") || "1");
//     if (Number.isNaN(step) || step < 1 || step > 3) return 1;
//     return step;
//   }, [searchParams]);

//   const subtotal = cart.reduce(
//     (acc, item) => acc + item.price * item.quantity,
//     0,
//   );
//   const discount = cart.reduce(
//     (acc, item) =>
//       acc + (item.price - (item.discountPrice ?? item.price)) * item.quantity,
//     0,
//   );
//   const finalTotal = subtotal - discount;

//   const nextStep = () =>
//     router.push(`/cart?step=${Math.min(activeStep + 1, 3)}`);
//   const prevStep = () =>
//     router.push(`/cart?step=${Math.max(activeStep - 1, 1)}`);

//   const canContinueFromCart = cart.length > 0;

//   return (
//     <main className="mx-auto mt-6 md:mt-10 w-full max-w-7xl px-4 pb-12">
//       <section className="rounded-3xl bg-gradient-to-l from-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-xl">
//         <h1 className="text-xl md:text-2xl font-bold">تکمیل سفارش</h1>
//         <p className="mt-2 text-sm md:text-base text-blue-100">
//           مراحل خرید را سریع و ساده تکمیل کنید.
//         </p>

//         <div className="mt-6 grid grid-cols-3 gap-2 md:gap-4">
//           {steps.map((step) => {
//             const Icon = step.icon;
//             const isActive = step.id === activeStep;
//             const isCompleted = step.id < activeStep;

//             return (
//               <button
//                 type="button"
//                 key={step.id}
//                 onClick={() => {
//                   if (step.id === 1 || (step.id === 2 && canContinueFromCart)) {
//                     router.push(`/cart?step=${step.id}`);
//                   }
//                 }}
//                 className={`rounded-2xl border p-3 md:p-4 text-right transition ${
//                   isActive
//                     ? "border-white/80 bg-white/20"
//                     : "border-white/20 bg-white/10"
//                 }`}
//               >
//                 <div className="flex items-center justify-between">
//                   <div
//                     className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                       isCompleted ? "bg-green-500" : "bg-white/20"
//                     }`}
//                   >
//                     {isCompleted ? (
//                       <BadgeCheck className="w-4 h-4" />
//                     ) : (
//                       <Icon className="w-4 h-4" />
//                     )}
//                   </div>
                
//                    <p className="mt-2 text-xs md:text-base font-semibold">
//                   {step.title}
//                 </p>
//                 </div>
              
//               </button>
//             );
//           })}
//         </div>
//       </section>

//       <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
//         <div className="xl:col-span-8 rounded-3xl border border-gray-100 bg-white p-4 md:p-6 shadow-sm">
//           {activeStep === 1 ? (
//             cart.length ? (
//               <div className="space-y-4">
//                 {cart.map((item) => (
//                   <article
//                     key={item.id}
//                     className="rounded-2xl border border-gray-100 bg-gray-50 p-4 md:p-5"
//                   >
//                     <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//                       <div className="flex items-center gap-3 md:gap-4 min-w-0">
//                         <div className="relative h-16 w-20 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0">
//                           <Image
//                             src={item.image}
//                             alt={item.title}
//                             fill
//                             className="object-contain p-1"
//                           />
//                         </div>
//                         <div className="min-w-0">
//                           <p className="font-semibold text-sm md:text-base text-gray-800 truncate">
//                             {item.title}
//                           </p>
//                           <p className="text-xs text-gray-500 mt-1">
//                             قیمت واحد:{" "}
//                             {formatPrice(item.discountPrice ?? item.price)}{" "}
//                             تومان
//                           </p>
//                         </div>
//                       </div>

//                       <div className="flex items-center justify-between sm:justify-end gap-4">
//                         <div className="flex items-center gap-2 rounded-xl border bg-white p-1">
//                           <button
//                             title="decreaseQty"
//                             onClick={() => decreaseQty(item.id)}
//                             className="h-8 w-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center"
//                           >
//                             <Minus className="w-4 h-4" />
//                           </button>
//                           <span className="w-7 text-center text-sm font-semibold">
//                             {item.quantity}
//                           </span>
//                           <button
//                             title="increaseQty"
//                             onClick={() => increaseQty(item.id)}
//                             className="h-8 w-8 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center justify-center"
//                           >
//                             <Plus className="w-4 h-4" />
//                           </button>
//                         </div>

//                         <div className="text-left">
//                           <p className="font-bold text-sm md:text-base text-gray-900 whitespace-nowrap">
//                             {formatPrice(
//                               (item.discountPrice ?? item.price) *
//                                 item.quantity,
//                             )}{" "}
//                             تومان
//                           </p>
//                         </div>

//                         <button
//                           title="حذف از سبد خرید"
//                           onClick={() => removeFromCart(item)}
//                           className="h-9 w-9 rounded-xl bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
//                         >
//                           <Trash2 className="w-4 h-4" />
//                         </button>
//                       </div>
//                     </div>
//                   </article>
//                 ))}
//               </div>
//             ) : (
//               <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
//                 <ShoppingCart className="w-10 h-10 text-gray-400 mx-auto" />
//                 <p className="mt-4 text-gray-700 font-semibold">
//                   سبد خرید شما خالی است.
//                 </p>
//                 <p className="text-sm text-gray-500 mt-1">
//                   برای ادامه، یک محصول به سبد اضافه کنید.
//                 </p>
//                 <button
//                   onClick={() => router.push("/products")}
//                   className="mt-5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
//                 >
//                   مشاهده محصولات
//                 </button>
//               </div>
//             )
//           ) : activeStep === 2 ? (
//             <ShippingForm
//               selectedAddress={selectedAddress}
//               setSelectedAddress={setSelectedAddress}
//             />
//           ) : selectedAddress ? (
//             <PaymentForm selectedAddress={selectedAddress} />
//           ) : (
//             <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
//               لطفا ابتدا آدرس را در مرحله قبل انتخاب کنید.
//             </div>
//           )}
//         </div>

//         <aside className="xl:col-span-4 h-max rounded-3xl border border-gray-100 bg-white p-5 md:p-6 shadow-sm xl:sticky xl:top-6">
//           <h2 className="text-lg font-bold text-gray-900">خلاصه سفارش</h2>

//           <div className="mt-5 space-y-3 text-sm">
//             <div className="flex justify-between">
//               <span className="text-gray-500">تعداد اقلام</span>
//               <span className="font-medium">
//                 {cart.reduce((acc, item) => acc + item.quantity, 0)}
//               </span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-500">جمع کالاها</span>
//               <span className="font-medium">{formatPrice(subtotal)} تومان</span>
//             </div>

//             <div className="flex justify-between">
//               <span className="text-gray-500">تخفیف</span>
//               <span className="font-medium text-green-600">
//                 {formatPrice(discount)} تومان
//               </span>
//             </div>
//           </div>

//           <div className="my-5 border-t pt-4 flex justify-between items-center">
//             <span className="text-gray-900 font-semibold">
//               مبلغ قابل پرداخت
//             </span>
//             <span className="text-lg font-extrabold text-blue-700">
//               {formatPrice(finalTotal)} تومان
//             </span>
//           </div>

//           <div className="space-y-2">
//             {activeStep > 1 && (
//               <button
//                 onClick={prevStep}
//                 className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
//               >
//                 بازگشت به مرحله قبل
//               </button>
//             )}

//             {activeStep === 1 && (
//               <button
//                 onClick={nextStep}
//                 disabled={!canContinueFromCart}
//                 className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 ${
//                   canContinueFromCart
//                     ? "bg-blue-600 hover:bg-blue-700"
//                     : "bg-gray-300 cursor-not-allowed"
//                 }`}
//               >
//                 ادامه
//                 <ArrowLeft className="w-4 h-4" />
//               </button>
//             )}
//           </div>
//         </aside>
//       </section>
//     </main>
//   );
// };

// export default CartPage;

"use client";

import useCartStore from "@/stores/cartStore";
import { formatPrice } from "@/helpers/Price";
import { Address } from "@/types";
import {
  ArrowLeft,
  CircleCheck,
  CreditCard,
  MapPin,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PaymentForm from "../components/PaymentForm";
import ShippingForm from "../components/ShippingForm";

const steps = [
  {
    id: 1,
    title: "سبد خرید",
    icon: ShoppingBag,
    description: "بازبینی و ویرایش کالاها",
  },
  {
    id: 2,
    title: "آدرس",
    icon: MapPin,
    description: "انتخاب یا ثبت آدرس تحویل",
  },
  {
    id: 3,
    title: "پرداخت",
    icon: CreditCard,
    description: "مرور سفارش و پرداخت امن",
  },
] as const;

const CartPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const activeStep = Number(searchParams.get("step") || "1");

  const { cart, removeFromCart, increaseQty, decreaseQty } = useCartStore();

  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discount = cart.reduce(
      (acc, item) =>
        acc + (item.price - (item.discountPrice ?? item.price)) * item.quantity,
      0
    );
    const final = subtotal - discount;

    return {
      subtotal,
      discount,
      final,
      quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
    };
  }, [cart]);

  useEffect(() => {
    const cachedAddress = sessionStorage.getItem("checkout:selected-address");

    if (cachedAddress) {
      try {
        setSelectedAddress(JSON.parse(cachedAddress));
      } catch {
        sessionStorage.removeItem("checkout:selected-address");
      }
    }
  }, []);

  useEffect(() => {
    if (selectedAddress) {
      sessionStorage.setItem(
        "checkout:selected-address",
        JSON.stringify(selectedAddress)
      );
      return;
    }

    sessionStorage.removeItem("checkout:selected-address");
  }, [selectedAddress]);

  const goToStep = (step: number) => {
    if (step === 3 && !selectedAddress) {
      router.push("/cart?step=2", { scroll: false });
      return;
    }

    router.push(`/cart?step=${step}`, { scroll: false });
  };

  return (
    <div className="mx-0 mt-8 min-h-[60vh] bg-slate-50/70 pb-12 md:container md:mx-auto">
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-xl font-bold text-slate-900 md:text-2xl">فرایند خرید</h1>
          <p className="text-sm text-slate-500">
            مراحل خرید را تکمیل کنید تا سفارش شما با سرعت بیشتری پردازش شود.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = step.id === activeStep;
            const isDone = step.id < activeStep;

            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-right transition ${
                  isActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-emerald-100 text-emerald-600"
                      : isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isDone ? (
                    <CircleCheck className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? "text-blue-700" : "text-slate-800"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-slate-500">{step.description}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-6 lg:flex-row">
          <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6 lg:w-8/12">
            {activeStep === 1 ? (
              cart.length ? (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-16 w-20 overflow-hidden rounded-lg bg-slate-50">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-contain"
                          />
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            قیمت واحد: {formatPrice(item.discountPrice ?? item.price)} تومان
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 md:justify-end">
                        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1">
                          <button
                            onClick={() => decreaseQty(item.id)}
                            className="h-7 w-7 rounded-full bg-white text-sm text-slate-700"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => increaseQty(item.id)}
                            className="h-7 w-7 rounded-full bg-white text-sm text-slate-700"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-sm font-semibold text-slate-800">
                          {formatPrice((item.discountPrice ?? item.price) * item.quantity)} تومان
                        </div>

                        <button
                          title="حذف از سبد خرید"
                          onClick={() => removeFromCart(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-500 transition hover:bg-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
                  سبد خرید شما خالی است.
                </p>
              )
            ) : activeStep === 2 ? (
              <ShippingForm
                selectedAddress={selectedAddress}
                setSelectedAddress={setSelectedAddress}
              />
            ) : selectedAddress ? (
              <PaymentForm selectedAddress={selectedAddress} />
            ) : (
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                برای ادامه پرداخت ابتدا آدرس سفارش را مشخص کنید.
                <button
                  onClick={() => goToStep(2)}
                  className="mr-2 rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold"
                >
                  رفتن به مرحله آدرس
                </button>
              </div>
            )}
          </div>

          <div className="h-max w-full rounded-2xl border border-slate-100 bg-slate-50 p-5 lg:w-4/12">
            <h2 className="mb-4 text-base font-bold text-slate-900">خلاصه سفارش</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">تعداد کالا</span>
                <span className="font-medium text-slate-800">{totals.quantity}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">مبلغ کالاها</span>
                <span className="font-medium text-slate-800">
                  {formatPrice(totals.subtotal)} تومان
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">تخفیف</span>
                <span className="font-medium text-emerald-700">
                  {formatPrice(totals.discount)} تومان
                </span>
              </div>

              <hr className="border-slate-200" />

              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-slate-900">مبلغ قابل پرداخت</span>
                <span className="font-bold text-blue-700">
                  {formatPrice(totals.final)} تومان
                </span>
              </div>
            </div>

            {activeStep === 1 && cart.length > 0 && (
              <button
                onClick={() => goToStep(2)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-3 text-white transition hover:bg-blue-700"
              >
                ادامه فرایند خرید
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

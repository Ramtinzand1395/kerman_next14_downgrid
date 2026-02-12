"use client";
import { CreditCard, Gamepad2, Truck } from "lucide-react";
const buyingSteps = [
  {
    icon: Gamepad2,
    title: "انتخاب محصول",
    description:
      "بین کنسول‌ها، بازی‌ها و لوازم جانبی، محصول مناسب خودت را پیدا کن.",
  },
  {
    icon: CreditCard,
    title: "پرداخت امن",
    description: "از طریق درگاه امن بانکی سفارش را نهایی کن و رسید خرید بگیر.",
  },
  {
    icon: Truck,
    title: "تحویل سریع",
    description: "سفارشت در کوتاه‌ترین زمان ارسال می‌شود و قابل پیگیری است.",
  },
];

const Categories = () => (
    <div className="mt-6 grid gap-4 md:grid-cols-3 ">
      {buyingSteps.map(({ icon: Icon, title, description }, index) => (
        <article
          key={title}
          className="rounded-2xl  bg-gradient-to-br from-[#377dff]  to-[#001A6E] p-5 shadow-sm ring-1 ring-slate-100"
        >
          <div className="flex items-center justify-between">
            <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-indigo-900">
              {index + 1}
            </span>
            <div className="mb-3 inline-flex rounded-xl bg-indigo-50 p-2 text-indigo-700">
              <Icon size={20} />
            </div>
          </div>
          <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
          <p className="text-sm leading-6 text-slate-200">{description}</p>
        </article>
      ))}
    </div>
);

export default Categories;

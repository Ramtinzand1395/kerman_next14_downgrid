"use client";

import { useRouter } from "next/navigation";
import {
  Heart,
  MapPinHouse,
  MessageSquareText,
  ShoppingBasket,
  UserRound,
  Dices,
  WalletCards,
  Trophy,
} from "lucide-react";

export default function Stepper({ activeStep }: { activeStep: number }) {
  const steps = [
    { id: 1, title: "اطلاعات شخصی", icon: UserRound },
    { id: 2, title: "علاقه‌مندی‌ها", icon: Heart },
    { id: 3, title: "آدرس‌ها", icon: MapPinHouse },
    { id: 4, title: "نظرات من", icon: MessageSquareText },
    { id: 5, title: "سفارش‌ها", icon: ShoppingBasket },
    { id: 8, title: "کیف پول", icon: WalletCards },
    { id: 9, title: "باشگاه مشتریان", icon: Trophy },
    { id: 10, title: "گردونه شانس", icon: Dices },
  ];

  const router = useRouter();

  return (
    <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1">
      {steps.map((step) => {
        const Icon = step.icon;
        const isActive = step.id === activeStep;

        return (
          <button
            type="button"
            onClick={() =>
              router.push(`?step=${Number(step.id)}`, { scroll: false })
            }
            className={`flex items-center gap-2 shrink-0 rounded-xl border px-3 md:px-4 py-2.5 transition-all text-xs md:text-sm ${
              isActive
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-300"
                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-700"
            }`}
            key={step.id}
          >
            <Icon className="w-4 h-4" />
            <span className="font-medium">{step.title}</span>
          </button>
        );
      })}
    </div>
  );
}

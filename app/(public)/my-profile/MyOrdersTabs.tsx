"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "@/app/components/navigation/NavigationFeedback";
import { ShoppingBasket, Gamepad2 } from "lucide-react";
import dynamic from "next/dynamic";
import { PageLoading } from "@/app/components/loading/LoadingSystem";

const loading = () => <PageLoading />;
const MyStoreOrders = dynamic(() => import("./MyStoreOrders"), { loading });
const MyGameOrders = dynamic(() => import("./MyGameOrders"), { loading });

type TabKey = "products" | "games";

const tabs: { key: TabKey; title: string; icon: typeof ShoppingBasket }[] = [
  { key: "products", title: "سفارش‌های محصول", icon: ShoppingBasket },
  { key: "games", title: "نوبت‌ها و خدمات", icon: Gamepad2 },
];

export default function MyOrdersTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active: TabKey = searchParams.get("ordersTab") === "games" ? "games" : "products";
  const setActive = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ordersTab", tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="نوع سفارش" className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        {tabs.map(({ key, title, icon: Icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(key)}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold leading-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 sm:text-sm ${
                isActive
                  ? "bg-white text-indigo-800 shadow-sm"
                  : "text-slate-600 hover:text-indigo-800"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
            </button>
          );
        })}
      </div>

      {active === "products" ? <MyStoreOrders /> : <MyGameOrders />}
    </div>
  );
}

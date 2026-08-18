"use client";

import { useState } from "react";
import { ShoppingBasket, Gamepad2 } from "lucide-react";
import MyOrders from "./MyOrders";
import MyGameOrders from "./MyGameOrders";

type TabKey = "products" | "games";

const tabs: { key: TabKey; title: string; icon: typeof ShoppingBasket }[] = [
  { key: "products", title: "سفارش‌های محصول", icon: ShoppingBasket },
  { key: "games", title: "سفارش‌های نصب بازی", icon: Gamepad2 },
];

export default function MyOrdersTabs() {
  const [active, setActive] = useState<TabKey>("products");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.title}
            </button>
          );
        })}
      </div>

      <div>
        {active === "products" && <MyOrders />}
        {active === "games" && <MyGameOrders />}
      </div>
    </div>
  );
}

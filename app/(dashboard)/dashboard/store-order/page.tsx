"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Gamepad2,
  Package,
  Plus,
  SendHorizonal,
} from "lucide-react";
import { toast } from "react-toastify";

import { storeOrder } from "@/types";
import AddOrderModal from "./modals/addorder/AddOrderModal";
import OrderTable from "./OrderTable";
import StoreOrderCart from "./modals/StoreOrderCart";

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
  ps5Copy: storeOrder[];
};

const initialOrders: OrdersByConsole = {
  ps5: [],
  ps4: [],
  xbox: [],
  copy: [],
  ps5Copy: [],
};

const consoleSections: Array<{
  key: keyof OrdersByConsole;
  title: string;
  accent: string;
}> = [
  { key: "ps5", title: "پلی‌استیشن 5", accent: "border-indigo-200" },
  {
    key: "ps5Copy",
    title: "پلی استیشن 5 کپی خور",
    accent: "border-orange-200",
  },
  { key: "ps4", title: "پلی‌استیشن 4", accent: "border-sky-200" },
  { key: "copy", title: "پلی استیشن 4 کپی خور", accent: "border-amber-200" },
  { key: "xbox", title: "Xbox", accent: "border-emerald-200" },
];

export default function StoreOrder() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [orders, setOrders] = useState<OrdersByConsole>(initialOrders);
console.log(orders,"orders")
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/store-order");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "خطا در دریافت سفارش‌ها");
        }

        setOrders({
          ps5: data.ps5 || [],
          ps4: data.ps4 || [],
          xbox: data.xbox || [],
          copy: data.copy || [],
          ps5Copy: data.ps5Copy || [],
        });
      } catch (err) {
        console.error(err);
        toast.error("در دریافت لیست سفارشات مشکلی پیش آمد.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const totalOrders = useMemo(
    () => Object.values(orders).reduce((sum, list) => sum + list.length, 0),
    [orders],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-right">
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 md:text-3xl">
                مدیریت سفارشات فروشگاه
              </h1>
              <p className="text-sm text-slate-500 md:text-base">
                ثبت، پیگیری و به‌روزرسانی سفارش مشتریان به تفکیک دستگاه
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                مجموع سفارش‌ها: {totalOrders.toLocaleString("fa-IR")}
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                افزودن سفارش جدید
              </button>
            </div>
          </div>

          {isSendingSms && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
              <SendHorizonal className="h-4 w-4 animate-pulse" />
              ارسال پیامک در حال انجام است...
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StoreOrderCart
            title="کل سفارش‌ها"
            icon={Package}
            color="blue"
            link="store-order/all-orders"
          />
          <StoreOrderCart
            title="آرشیو بازی‌ها"
            icon={Gamepad2}
            color="green"
            link="store-order/all-gamelist"
          />
          <StoreOrderCart
            title="مدیریت مشتریان"
            icon={AlertCircle}
            color="amber"
            link="store-order/customers"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {consoleSections.map((section) => (
            <div
              key={section.key}
              className={`rounded-2xl border ${section.accent} bg-white p-4 shadow-sm md:p-5`}
            >
              <OrderTable
                header={section.title}
                Orders={orders[section.key]}
                setOrders={setOrders}
                consoleKey={section.key}
                isLoading={isLoading}
                setloadingSms={setIsSendingSms}
              />
            </div>
          ))}
        </section>

        {isAddModalOpen && (
          <AddOrderModal
            closeModal={() => setIsAddModalOpen(false)}
            setOrders={setOrders}
          />
        )}
      </main>
    </div>
  );
}

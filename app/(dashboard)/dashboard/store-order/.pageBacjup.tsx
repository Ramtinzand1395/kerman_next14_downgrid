"use client";

import { useEffect, useState } from "react";

import { AlertTriangle, DollarSign, Package, Plus } from "lucide-react";
import AddOrderModal from "./modals/addorder/AddOrderModal";
import { toast } from "react-toastify";
import { storeOrder } from "@/types";
import OrderTable from "./OrderTable";
import StoreOrderCart from "./modals/StoreOrderCart";

type OrdersByConsole = {
  ps5: storeOrder[];
  ps4: storeOrder[];
  xbox: storeOrder[];
  copy: storeOrder[];
};

export default function StoreOrder() {
  const [OpenAddItem, setOpenAddItem] = useState(false);
  const [Loading, setLoading] = useState(false);
  const [loadingSms, setloadingSms] = useState(false);

  const handleOpenModal = () => {
    setOpenAddItem(!OpenAddItem);
  };
  const closeModal = () => setOpenAddItem(false);

  const [orders, setOrders] = useState<OrdersByConsole>({
    ps5: [],
    ps4: [],
    xbox: [],
    copy: [],
  });

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/store-order`);

        const data = await res.json();

        setOrders({
          ps5: data.ps5 || [],
          ps4: data.ps4 || [],
          xbox: data.xbox || [],
          copy: data.copy || [],
        });
      } catch (err) {
        console.error(err);
        toast.error("خطای سرور");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-right">
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              لیست سفارشات مشتری
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              مدیریت موجودی و قیمت‌گذاری سفارشات فروشگاه
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            افزودن سفارش جدید
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StoreOrderCart
            title="کل سفارش ها"
            icon={Package}
            color="blue"
            link="store-order/all-orders"
          />
          <StoreOrderCart
            title="لیست بازی ها"
            icon={DollarSign}
            color="green"
            link="store-order/all-gamelist"
          />
          <StoreOrderCart
            title="اطلاعات مشتری"
            icon={AlertTriangle}
            color="amber"
            link="+5%"
          />
        </div>
        {loadingSms && (
          <p className="text-green-500 animate-bounce">در حال ارسال پیام</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2  gap-5 md:gap-2">
          <div className="bg-white shadow-md rounded-lg p-5">
            <OrderTable
              header="پلی استیشن 5"
              Orders={orders.ps5}
              setOrders={setOrders}
              consoleKey="ps5"
              isLoading={Loading}
              setloadingSms={setloadingSms}
            />
          </div>
          <div className="bg-white shadow-md rounded-lg p-5">
            <OrderTable
              header={"پلی استیشن 4"}
              Orders={orders.ps4}
              setOrders={setOrders}
              consoleKey="ps4"
              isLoading={Loading}
              setloadingSms={setloadingSms}
            />
          </div>
          <div className="bg-white shadow-md rounded-lg p-5">
            <OrderTable
              header={"کپی خور"}
              Orders={orders.copy}
              setOrders={setOrders}
              consoleKey="xbox"
              isLoading={Loading}
              setloadingSms={setloadingSms}
            />
          </div>
          <div className="bg-white shadow-md rounded-lg p-5">
            <OrderTable
              header={"Xbox"}
              Orders={orders.xbox}
              setOrders={setOrders}
              consoleKey="copy"
              isLoading={Loading}
              setloadingSms={setloadingSms}
            />
          </div>
        </div>
        {OpenAddItem && (
          <AddOrderModal closeModal={closeModal} setOrders={setOrders} />
        )}
      </main>
    </div>
  );
}

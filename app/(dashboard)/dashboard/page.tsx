// "use client";

// import { formatPrice } from "@/helpers/Price";
// import { useEffect, useState } from "react";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   Tooltip,
//   PieChart,
//   Pie,
//   Cell,
//   Legend,
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   CartesianGrid,
// } from "recharts";

// const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];

// const statusFa: Record<string, string> = {
//   cancelled: "لغو شده",
//   delivered: "تحویل شده",
//   pending: "در انتظار پرداخت",
//   processing: "در حال پردازش",
//   shipped: "ارسال شده",
// };

// const paymentFa: Record<string, string> = {
//   paid: "پرداخت شده",
//   unpaid: "پرداخت نشده",
//   failed: "ناموفق",
// };
// // تابع کمکی برای تبدیل تاریخ به شمسی
// const formatDateFa = (dateStr: string) => {
//   const date = new Date(dateStr);
//   return new Intl.DateTimeFormat("fa-IR", {
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//   }).format(date);
// };
// const DashboardPage = () => {
//   const [data, setData] = useState<any>(null);
//   const [revenueData, setRevenueData] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [range, setRange] = useState("monthly");

//   useEffect(() => {
//     setLoading(true);
//     Promise.all([
//       fetch(`/api/admin/statistics?range=${range}`).then((res) => res.json()),
//       fetch(`/api/admin/revenue?range=${range}`).then((res) => res.json()),
//     ]).then(([stats, revenue]) => {
//       setData(stats);
//       setRevenueData(revenue.data);
//       setLoading(false);
//     });
//   }, [range]);

//   if (loading)
//     return <div className="p-10 text-center">در حال بارگذاری...</div>;

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">داشبورد مدیریتی</h1>
//         <select
//           title="بازه زمانی"
//           value={range}
//           onChange={(e) => setRange(e.target.value)}
//           className="border rounded-xl px-4 py-2 bg-white shadow-sm"
//         >
//           <option value="daily">روزانه</option>
//           <option value="weekly">۷ روز اخیر</option>
//           <option value="monthly">ماهانه</option>
//           <option value="yearly">سالانه</option>
//         </select>
//       </div>

//       {/* کارت‌ها */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <p className="text-gray-500">تعداد کاربران</p>
//           <h2 className="text-2xl font-bold">{data.usersCount}</h2>
//         </div>
//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <p className="text-gray-500">تعداد محصولات</p>
//           <h2 className="text-2xl font-bold">{data.productsCount}</h2>
//         </div>
//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <p className="text-gray-500">تعداد سفارش‌ها</p>
//           <h2 className="text-2xl font-bold">{data.ordersCount}</h2>
//         </div>
//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <p className="text-gray-500">تعداد سفارش لیست</p>
//           <h2 className="text-2xl font-bold">{data.listOrdersCount}</h2>
//         </div>
//       </div>

//       {/* چارت‌ها */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <h3 className="mb-4 font-bold text-lg">وضعیت سفارشات</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={data.orderStatus.map((o: any) => ({
//                   name: statusFa[o._id] || o._id,
//                   value: o.count,
//                 }))}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={100}
//                 label
//               >
//                 {data.orderStatus.map((_: any, index: number) => (
//                   <Cell key={index} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Legend />
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>

//         <div className="bg-white p-5 rounded-lg shadow-md">
//           <h3 className="mb-4 font-bold text-lg">وضعیت پرداخت‌ها</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart
//               data={data.paymentStatus.map((p: any) => ({
//                 name: paymentFa[p._id] || p._id,
//                 value: p.count,
//               }))}
//             >
//               <XAxis dataKey="name" />
//               <YAxis />
//               <Tooltip />
//               <Bar dataKey="value" fill="#00C49F" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* نمودار درآمد */}
//       {/* <div className="bg-white p-5 rounded-lg shadow-md">
//         <h3 className="mb-4 font-bold text-lg">نمودار درآمد</h3>
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart data={revenueData}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="label" />
//             <YAxis />
//             <Tooltip />
//             <Line type="monotone" dataKey="value" stroke="#00C49F" strokeWidth={3} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div> */}
//       <div className="bg-white p-5 rounded-lg shadow-md">
//         <h3 className="mb-4 font-bold text-lg">نمودار درآمد</h3>
//         <ResponsiveContainer width="100%" height={300}>
//           <BarChart data={revenueData}>
//             <CartesianGrid strokeDasharray="3 3" />
//             <XAxis dataKey="label" />
//             <YAxis />
//             <Tooltip
//               formatter={(value: any) => formatPrice(value) + " تومان"}
//             />
//             <Bar dataKey="value" fill="#00C49F" />
//           </BarChart>
//         </ResponsiveContainer>
//         {/* نمایش بازه زمانی به فارسی پایین نمودار */}
//         <div className="mt-2 text-right text-gray-500">
//           {range === "daily" &&
//             `تاریخ: ${new Date().toLocaleDateString("fa-IR")}`}
//           {range === "weekly" &&
//             (() => {
//               const start = new Date();
//               start.setDate(start.getDate() - 7);
//               return `۷ روز گذشته: از ${start.toLocaleDateString(
//                 "fa-IR"
//               )} تا ${new Date().toLocaleDateString("fa-IR")}`;
//             })()}
//           {range === "monthly" &&
//             (() => {
//               const start = new Date();
//               start.setMonth(start.getMonth() - 1);
//               return `۳۰ روز گذشته: از ${start.toLocaleDateString(
//                 "fa-IR"
//               )} تا ${new Date().toLocaleDateString("fa-IR")}`;
//             })()}
//           {range === "yearly" &&
//             (() => {
//               const start = new Date();
//               start.setFullYear(start.getFullYear() - 1);
//               return `۱۲ ماه گذشته: از ${start.toLocaleDateString(
//                 "fa-IR"
//               )} تا ${new Date().toLocaleDateString("fa-IR")}`;
//             })()}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DashboardPage;

"use client";

import { formatPrice } from "@/helpers/Price";
import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A"];

const statusFa: Record<string, string> = {
  cancelled: "لغو شده",
  delivered: "تحویل شده",
  pending: "در انتظار پرداخت",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
};

const paymentFa: Record<string, string> = {
  paid: "پرداخت شده",
  unpaid: "پرداخت نشده",
  failed: "ناموفق",
};

// تابع کمکی برای تبدیل تاریخ به شمسی
const formatDateFa = (dateStr: string) => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const DashboardPage = () => {
  const [data, setData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("monthly");
  const [storeOrdersData, setstoreOrdersData] = useState<any[]>([]);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/dashboard/statistics?range=${range}`).then((res) =>
        res.json()
      ),
      fetch(`/api/admin/dashboard/revenue?range=${range}`).then((res) =>
        res.json()
      ),
      fetch(`/api/admin/dashboard/storerevenue?range=${range}`).then((res) =>
        res.json()
      ),
    ]).then(([stats, revenue, store]) => {
      const formattedRevenue = revenue.data.map((item: any) => ({
        label: formatDateFa(item.label),
        value: item.value,
      }));

      setData(stats);
      setRevenueData(formattedRevenue);
      // setstoreOrdersData(store);
      setstoreOrdersData(store.data.map((item: any) => ({
  label: formatDateFa(item.date), // تاریخ شمسی
  value: item.price,              // قیمت
})));
      setLoading(false);
    });
  }, [range]);

  if (loading)
    return <div className="p-10 text-center">در حال بارگذاری...</div>;

  const getRangeLabel = () => {
    const today = formatDateFa(new Date().toISOString());
    if (range === "daily") return `تاریخ: ${today}`;
    if (range === "weekly") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return `۷ روز گذشته: از ${formatDateFa(start.toISOString())} تا ${today}`;
    }
    if (range === "monthly") {
      const start = new Date();
      start.setMonth(start.getMonth() - 1);
      return `۳۰ روز گذشته: از ${formatDateFa(
        start.toISOString()
      )} تا ${today}`;
    }
    if (range === "yearly") {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      return `۱۲ ماه گذشته: از ${formatDateFa(
        start.toISOString()
      )} تا ${today}`;
    }
    return "";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">داشبورد مدیریتی</h1>
        <select
          title="بازه زمانی"
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border rounded-xl px-4 py-2 bg-white shadow-sm"
        >
          <option value="daily">روزانه</option>
          <option value="weekly">۷ روز اخیر</option>
          <option value="monthly">ماهانه</option>
          <option value="yearly">سالانه</option>
        </select>
      </div>

      {/* کارت‌ها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-md">
          <p className="text-gray-500">تعداد کاربران</p>
          <h2 className="text-2xl font-bold">{data.usersCount}</h2>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md">
          <p className="text-gray-500">تعداد محصولات</p>
          <h2 className="text-2xl font-bold">{data.productsCount}</h2>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md">
          <p className="text-gray-500">تعداد سفارش‌ها</p>
          <h2 className="text-2xl font-bold">{data.ordersCount}</h2>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-md">
          <p className="text-gray-500">تعداد سفارش لیست</p>
          <h2 className="text-2xl font-bold">{data.listOrdersCount}</h2>
        </div>
      </div>

      {/* چارت‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* وضعیت سفارشات */}
        <div className="bg-white p-5 rounded-lg shadow-md">
          <h3 className="mb-4 font-bold text-lg">وضعیت سفارشات</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.orderStatus.map((o: any) => ({
                  name: statusFa[o._id] || o._id,
                  value: o.count,
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.orderStatus.map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* وضعیت پرداخت‌ها */}
        <div className="bg-white p-5 rounded-lg shadow-md">
          <h3 className="mb-4 font-bold text-lg">وضعیت پرداخت‌ها</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.paymentStatus.map((p: any) => ({
                name: paymentFa[p._id] || p._id,
                value: p.count,
              }))}
            >
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => formatPrice(value) + " تومان"}
              />
              <Bar dataKey="value" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* نمودار درآمد */}
      <div className="bg-white p-5 rounded-lg shadow-md">
        <h3 className="mb-4 font-bold text-lg">نمودار درآمد</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value: any) => formatPrice(value) + " تومان"}
            />
            <Bar dataKey="value" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
        {/* بازه زمانی فارسی پایین نمودار */}
        <div className="mt-2 text-right text-gray-500">{getRangeLabel()}</div>
      </div>
      {/* نمودار قیمت سفارش‌ها */}
      <div className="bg-white p-5 rounded-lg shadow-md">
        <h3 className="mb-4 font-bold text-lg">نمودار قیمت سفارش‌ها</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={storeOrdersData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip
              formatter={(value: any) => formatPrice(value) + " تومان"}
            />
            <Bar dataKey="value" fill="#FF8042" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-right text-gray-500">{getRangeLabel()}</div>
      </div>
    </div>
  );
};

export default DashboardPage;

"use client";

export default function DashboardPage() {
  return (
    <div className=" grid grid-cols-1 lg:grid-cols-4 gap-4  min-h-screen">
      {/* Total Revenue */}
      <div className="bg-gray-200 p-4 rounded-2xl lg:col-span-3 2xl:col-span-3 shadow-lg">
        <h2 className=" mb-3 text-lg font-medium">در آمد وب سایت </h2>
        {/* <JalaliAreaChart endpoint="/api/stats/monthly" /> */}
      </div>

      {/* Latest Transactions */}
      <div className="bg-gray-200 p-4 rounded-2xl shadow-lg">
        {/* <CardList title="آخرین سفارش مشتری= " type="transactions" /> */}
      </div>

      {/* Todo List */}
      {/* <div className="bg-gray-200 p-4 rounded-2xl shadow-lg">
        <TodoList />
      </div> */}

      {/* Total Visitors */}

      {/* Browser Usage */}
      <div className="bg-gray-200 p-4 lg:col-span-3 2xl:col-span-3  rounded-2xl shadow-lg">
        {/* <JalaliAreaChart endpoint="/api/stats/customer-orders" /> */}
      </div>

      {/* Popular Products */}
      <div className="bg-gray-200 p-4 rounded-2xl shadow-lg">
        {/* <CardList title="آخرین محصولات " type="products" /> */}
      </div>
    </div>
  );
}

"use client";

import Skeleton from "react-loading-skeleton";

const OrderSkeleton = ({ rows = 5 }: { rows?: number }) => {
   return (
    <div className="mt-5 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-4 gap-4 bg-gray-100 rounded-md py-4 px-2"
        >
          {/* نام خانوادگی */}
          <Skeleton
            height={16}
            width={80}
            baseColor="#e5e7eb"
            highlightColor="#f3f4f6"
            borderRadius={6}
          />

          {/* وضعیت سفارش */}
          <div className="flex justify-around">
            <Skeleton circle width={24} height={24} />
            <Skeleton circle width={24} height={24} />
            <Skeleton circle width={24} height={24} />
          </div>

          {/* کد دریافت */}
          <Skeleton
            height={16}
            width={60}
            baseColor="#e5e7eb"
            highlightColor="#f3f4f6"
            borderRadius={6}
          />

          {/* توضیحات */}
          <Skeleton
            height={16}
            width="100%"
            baseColor="#e5e7eb"
            highlightColor="#f3f4f6"
            borderRadius={6}
          />
        </div>
      ))}
    </div>
  );
};

export default OrderSkeleton;

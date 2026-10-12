import { Skeleton } from "@/app/components/loading/LoadingSystem";

const OrderSkeleton = ({ rows = 5 }: { rows?: number }) => {
   return (
    <div className="mt-5 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-4 gap-4 bg-gray-100 rounded-md py-4 px-2"
        >
          {/* نام خانوادگی */}
          <Skeleton className="h-4 w-20 rounded-md" />

          {/* وضعیت سفارش */}
          <div className="flex justify-around">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>

          {/* کد دریافت */}
          <Skeleton className="h-4 w-16 rounded-md" />

          {/* توضیحات */}
          <Skeleton className="h-4 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
};

export default OrderSkeleton;

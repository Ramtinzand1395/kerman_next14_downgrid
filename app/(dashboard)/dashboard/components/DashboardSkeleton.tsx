import Skeleton from "react-loading-skeleton";

 const DashboardSkeleton = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* هدر */}
      <div className="flex justify-between items-center">
        <Skeleton width={220} height={28} />
        <Skeleton width={140} height={40} className="rounded-xl" />
      </div>

      {/* کارت‌ها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow-md space-y-3">
            <Skeleton width={120} />
            <Skeleton height={28} width={80} />
          </div>
        ))}
      </div>

      {/* چارت‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow-md space-y-4">
            <Skeleton width={160} height={22} />
            <Skeleton height={260} className="rounded-xl" />
          </div>
        ))}
      </div>

      {/* نمودارها */}
      {[1, 2].map((i) => (
        <div key={i} className="bg-white p-5 rounded-lg shadow-md space-y-4">
          <Skeleton width={180} height={22} />
          <Skeleton height={260} className="rounded-xl" />
        </div>
      ))}
    </div>
  );
};

export default DashboardSkeleton;
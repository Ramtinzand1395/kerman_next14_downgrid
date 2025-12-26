"use client"
// components/ProductSkeleton.tsx
import Skeleton from "react-loading-skeleton";

export default function SkeletonLoading() {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <Skeleton height={160} borderRadius={8} />

      <div className="mt-3">
        <Skeleton height={16} width="75%" />
      </div>

      <div className="mt-2">
        <Skeleton height={16} width="50%" />
      </div>

      <div className="mt-3">
        <Skeleton height={32} borderRadius={6} />
      </div>
    </div>
  );
}

import { Skeleton } from "@/app/components/loading/LoadingSystem";

export default function SkeletonLoading() {
  return (
    <div className="rounded-lg border bg-white p-3" aria-hidden="true">
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="mt-3 h-4 w-3/4 rounded" />
      <Skeleton className="mt-2 h-4 w-1/2 rounded" />
      <Skeleton className="mt-3 h-8 rounded-md" />
    </div>
  );
}

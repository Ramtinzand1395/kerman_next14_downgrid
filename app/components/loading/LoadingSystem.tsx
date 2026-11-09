import { LoaderCircle } from "lucide-react";

/* The brand mark is a local SVG and intentionally bypasses Next image optimization. */
/* eslint-disable @next/next/no-img-element */

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`loading-skeleton block ${className}`} />;
}

function LoadingRegion({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className} role="status" aria-busy="true" aria-label={label}><span className="sr-only">{label}</span><div aria-hidden="true">{children}</div></div>;
}

export function ButtonLoading({ label = "در حال ثبت…" }: { label?: string }) {
  return <span role="status" className="inline-flex items-center justify-center gap-2 whitespace-nowrap"><LoaderCircle aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /><span>{label}</span></span>;
}

export function PageLoading({ label = "در حال آماده‌سازی صفحه…" }: { label?: string }) {
  return <LoadingRegion label={label} className="mx-auto flex min-h-[clamp(22rem,62vh,42rem)] w-full max-w-6xl items-center justify-center px-4 py-8"><div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-blue-100 bg-white p-7 text-center shadow-[0_18px_55px_rgba(20,74,145,0.10)]"><span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-blue-700 via-blue-500 to-cyan-400" /><span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 ring-1 ring-blue-100"><img src="/atari-seeklogo.svg" alt="" className="h-14 w-14 object-contain" /></span><p className="mt-5 text-base font-black text-[#0b1d48]">کرمان آتاری</p><p className="mt-1 text-sm text-slate-500">{label}</p><div className="mx-auto mt-5 h-1.5 w-36 overflow-hidden rounded-full bg-blue-100"><span className="loading-progress block h-full w-1/2 rounded-full bg-blue-600" /></div></div></LoadingRegion>;
}

function ProductCardSkeleton() {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3"><Skeleton className="aspect-square w-full rounded-xl" /><Skeleton className="mt-3 h-4 w-5/6 rounded" /><Skeleton className="mt-2 h-4 w-1/2 rounded" /><Skeleton className="mt-4 h-10 w-full rounded-xl" /></div>;
}

export function GameCardsSkeleton() {
  return (
    <LoadingRegion label="در حال دریافت بازی‌ها…" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="rounded-2xl border-2 border-slate-100 bg-white p-2">
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <Skeleton className="mt-3 h-5 w-12 rounded-lg" />
          <Skeleton className="mt-2 h-10 w-full rounded" />
          <Skeleton className="mt-2 h-4 w-16 rounded" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function ProductGridSkeleton() {
  return <LoadingRegion label="در حال دریافت محصولات…" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}</LoadingRegion>;
}

export function NotificationListSkeleton({ compact = false }: { compact?: boolean }) {
  return <LoadingRegion label="در حال دریافت اعلان‌ها…" className="space-y-3">{Array.from({ length: compact ? 3 : 5 }).map((_, i) => <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><Skeleton className="h-3 w-3 shrink-0 rounded-full" /><div className="w-full"><Skeleton className="h-5 w-2/5 rounded" /><Skeleton className="mt-3 h-4 w-full rounded" /><Skeleton className="mt-2 h-3 w-24 rounded" /></div></div></div>)}</LoadingRegion>;
}

export function DashboardRouteSkeleton({ variant = "table" }: { variant?: "overview" | "table" | "form" | "notifications" }) {
  const rows = variant === "overview" ? 4 : 7;
  return <LoadingRegion label="در حال دریافت اطلاعات پنل…" className="space-y-5"><div className="flex items-center justify-between gap-4"><div><Skeleton className="h-8 w-52 rounded-lg" /><Skeleton className="mt-2 h-4 w-72 max-w-full rounded" /></div><Skeleton className="h-11 w-32 rounded-xl" /></div>{variant === "overview" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>}{variant === "form" ? <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div><Skeleton className="h-96 rounded-2xl" /></div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 rounded" />)}</div>{Array.from({ length: rows }).map((_, i) => <div key={i} className="grid grid-cols-4 gap-4 border-b border-slate-100 p-4 last:border-0">{Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-5 rounded" />)}</div>)}</div>}</LoadingRegion>;
}

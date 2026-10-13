import { LoaderCircle } from "lucide-react";

/* The brand mark is a local SVG and intentionally bypasses Next image optimization. */
/* eslint-disable @next/next/no-img-element */

export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`loading-skeleton block ${className}`} />;
}

function LoadingRegion({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={className} role="status" aria-busy="true" aria-label={label}><span className="sr-only">{label}</span><div aria-hidden="true">{children}</div></div>;
}

export function InlineLoading({ label = "در حال بارگذاری…", className = "" }: { label?: string; className?: string }) {
  return <span role="status" className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`}><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /><span>{label}</span></span>;
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

export function LandingSkeleton() {
  return <LoadingRegion label="در حال دریافت محتوای صفحه اصلی…" className="mx-auto w-full max-w-[1440px] px-3 pb-12 pt-4 sm:px-5 lg:px-6"><div className="grid min-h-[360px] overflow-hidden rounded-3xl border border-blue-100 bg-white lg:grid-cols-[1.1fr_0.9fr]"><div className="space-y-5 bg-blue-900 p-6 sm:p-10"><Skeleton className="h-8 w-32 rounded-full !bg-blue-700" /><Skeleton className="h-12 w-4/5 rounded-xl !bg-blue-700" /><Skeleton className="h-5 w-full rounded !bg-blue-800" /><Skeleton className="h-5 w-3/4 rounded !bg-blue-800" /><div className="flex gap-3"><Skeleton className="h-12 w-36 rounded-xl !bg-blue-700" /><Skeleton className="h-12 w-36 rounded-xl !bg-blue-700" /></div></div><Skeleton className="min-h-64 w-full rounded-none" /></div><div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6"><Skeleton className="h-7 w-48 rounded" /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div></div></LoadingRegion>;
}

export function ProductsSkeleton() {
  return <LoadingRegion label="در حال دریافت محصولات…" className="mx-auto my-6 w-full max-w-[1440px] px-4 md:px-6"><div className="rounded-3xl bg-blue-800 p-5 md:p-8"><Skeleton className="h-9 w-2/3 max-w-xl rounded-xl !bg-blue-700" /><Skeleton className="mt-4 h-5 w-full max-w-3xl rounded !bg-blue-700" /><Skeleton className="mt-6 h-12 w-full rounded-2xl !bg-blue-700" /></div><Skeleton className="mt-5 h-20 w-full rounded-2xl" /><div className="mt-5 flex gap-5"><Skeleton className="hidden h-[520px] w-72 shrink-0 rounded-2xl md:block" /><div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div></div></LoadingRegion>;
}

export function ProductDetailsSkeleton() {
  return <LoadingRegion label="در حال دریافت جزئیات محصول…" className="container mx-auto px-3 py-6 md:px-6 md:py-10"><div className="rounded-2xl border border-slate-200 bg-white p-5"><Skeleton className="h-4 w-56 rounded" /><Skeleton className="mt-4 h-9 w-2/3 rounded-lg" /><Skeleton className="mt-3 h-4 w-full max-w-3xl rounded" /></div><div className="mt-6 grid gap-6 lg:grid-cols-12"><div className="space-y-6 lg:col-span-9"><div className="grid gap-7 rounded-3xl border border-slate-200 bg-white p-5 xl:grid-cols-12"><div className="xl:col-span-5"><Skeleton className="aspect-square w-full rounded-2xl" /><div className="mt-3 grid grid-cols-5 gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div></div><div className="space-y-4 xl:col-span-7"><Skeleton className="h-8 w-4/5 rounded" /><Skeleton className="h-5 w-1/2 rounded" /><Skeleton className="h-24 w-full rounded-2xl" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div></div><Skeleton className="h-64 w-full rounded-3xl" /></div><div className="space-y-4 lg:col-span-3"><Skeleton className="h-72 w-full rounded-2xl" /><Skeleton className="h-44 w-full rounded-2xl" /></div></div></LoadingRegion>;
}

export function BlogListSkeleton() {
  return <LoadingRegion label="در حال دریافت مقاله‌ها…" className="mx-auto max-w-6xl px-4 py-8 md:py-12"><Skeleton className="h-9 w-32 rounded-lg" /><Skeleton className="mt-3 h-4 w-64 rounded" /><div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><Skeleton className="h-48 rounded-none" /><div className="p-4"><Skeleton className="h-6 w-4/5 rounded" /><Skeleton className="mt-3 h-4 w-full rounded" /><Skeleton className="mt-2 h-4 w-2/3 rounded" /></div></div>)}</div></LoadingRegion>;
}

export function ArticleSkeleton() {
  return <LoadingRegion label="در حال دریافت مقاله…" className="mx-auto max-w-4xl px-4 py-8 md:py-12"><Skeleton className="h-5 w-24 rounded" /><Skeleton className="mt-4 h-11 w-4/5 rounded-lg" /><Skeleton className="mt-3 h-4 w-52 rounded" /><Skeleton className="mt-7 h-24 w-full rounded-xl" /><Skeleton className="mt-6 h-72 w-full rounded-2xl md:h-96" /><div className="mt-8 space-y-3">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className={`h-4 rounded ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />)}</div></LoadingRegion>;
}

export function ProfileSkeleton() {
  return <LoadingRegion label="در حال آماده‌سازی پروفایل…" className="container mx-auto px-3 py-6 md:px-6 md:py-8"><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><div className="hidden space-y-3 rounded-2xl border border-slate-200 bg-white p-5 lg:block"><Skeleton className="h-20 rounded-xl" />{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div><div className="space-y-4"><Skeleton className="h-24 rounded-2xl" /><div className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5"><Skeleton className="h-8 w-48 rounded" /><div className="mt-7 grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div></div></div></div></LoadingRegion>;
}

export function CartSkeleton() {
  return <LoadingRegion label="در حال آماده‌سازی سبد خرید…" className="mx-auto mt-6 w-full max-w-7xl px-4 pb-16 md:mt-10"><Skeleton className="h-64 rounded-3xl !bg-blue-800" /><div className="mt-6 grid gap-6 xl:grid-cols-12"><div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 xl:col-span-8">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div><Skeleton className="h-80 rounded-3xl xl:col-span-4" /></div></LoadingRegion>;
}

export function NotificationListSkeleton({ compact = false }: { compact?: boolean }) {
  return <LoadingRegion label="در حال دریافت اعلان‌ها…" className="space-y-3">{Array.from({ length: compact ? 3 : 5 }).map((_, i) => <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex gap-3"><Skeleton className="h-3 w-3 shrink-0 rounded-full" /><div className="w-full"><Skeleton className="h-5 w-2/5 rounded" /><Skeleton className="mt-3 h-4 w-full rounded" /><Skeleton className="mt-2 h-3 w-24 rounded" /></div></div></div>)}</LoadingRegion>;
}

export function DashboardRouteSkeleton({ variant = "table" }: { variant?: "overview" | "table" | "form" | "notifications" }) {
  const rows = variant === "overview" ? 4 : 7;
  return <LoadingRegion label="در حال دریافت اطلاعات پنل…" className="space-y-5"><div className="flex items-center justify-between gap-4"><div><Skeleton className="h-8 w-52 rounded-lg" /><Skeleton className="mt-2 h-4 w-72 max-w-full rounded" /></div><Skeleton className="h-11 w-32 rounded-xl" /></div>{variant === "overview" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>}{variant === "form" ? <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div><Skeleton className="h-96 rounded-2xl" /></div> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 rounded" />)}</div>{Array.from({ length: rows }).map((_, i) => <div key={i} className="grid grid-cols-4 gap-4 border-b border-slate-100 p-4 last:border-0">{Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-5 rounded" />)}</div>)}</div>}</LoadingRegion>;
}

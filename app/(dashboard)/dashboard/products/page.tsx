// "use client";

// import Image from "next/image";
// import { useEffect, useMemo, useState } from "react";
// import { toast } from "react-toastify";
// import Skeleton from "react-loading-skeleton";

// import {
//   AlertTriangle,
//   DollarSign,
//   Edit2,
//   MessageSquare,
//   Package,
//   Plus,
//   RefreshCcw,
//   Search,
//   Trash2,
// } from "lucide-react";

// import { Product } from "@/types";
// import { formatPrice } from "@/helpers/Price";
// import StatsCard from "../components/StatsCard";
// import AddProductDrawer from "../components/drawers/AddProductDrawer";

// type DrawerState = {
//   type: "add" | "edit" | null;
//   product: Product | null;
// };

// type StockFilter = "all" | "low" | "out";

// export default function ProductsPage() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalCount, setTotalCount] = useState(0);
//   const [query, setQuery] = useState("");
//   const [stockFilter, setStockFilter] = useState<StockFilter>("all");
//   const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

//   const [stats, setStats] = useState({
//     total: 0,
//     value: 0,
//     lowStock: 0,
//     comments: 0,
//     verifiedComments: 0,
//   });

//   const [drawer, setDrawer] = useState<DrawerState>({
//     type: null,
//     product: null,
//   });

//   const fetchProducts = async (targetPage: number) => {
//     try {
//       setLoading(true);
//       const res = await fetch(`/api/admin/product?page=${targetPage}&limit=10`);
//       if (!res.ok) throw new Error("خطا در دریافت محصولات");

//       const data = await res.json();
//       setProducts(data.products ?? []);
//       setTotalPages(data.totalPages ?? 1);
//       setTotalCount(data.total ?? 0);
//       setStats(data.stats);
//     } catch (err) {
//       console.error(err);
//       toast.error("خطا در دریافت محصولات");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchProducts(page);
//   }, [page]);

//   const filteredProducts = useMemo(() => {
//     return products.filter((product) => {
//       const normalized = query.trim().toLowerCase();
//       const matchesSearch =
//         !normalized ||
//         product.title.toLowerCase().includes(normalized) ||
//         product.sku?.toLowerCase().includes(normalized) ||
//         product.category?.name?.toLowerCase().includes(normalized);

//       if (!matchesSearch) return false;
//       if (stockFilter === "low") return product.stock > 0 && product.stock < 10;
//       if (stockFilter === "out") return product.stock <= 0;
//       return true;
//     });
//   }, [products, query, stockFilter]);

//   const handleDelete = async (id: string) => {
//     if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

//     try {
//       setActionLoadingId(id);
//       const res = await fetch(`/api/admin/product/${id}`, {
//         method: "DELETE",
//       });

//       if (!res.ok) {
//         const errorData = await res.json().catch(() => ({}));
//         throw new Error(errorData.error ?? "حذف محصول ناموفق بود");
//       }

//       toast.success("محصول با موفقیت حذف شد.");

//       const nextCount = products.length - 1;
//       if (nextCount <= 0 && page > 1) {
//         setPage((prev) => prev - 1);
//       } else {
//         await fetchProducts(page);
//       }
//     } catch (err) {
//       const message = err instanceof Error ? err.message : "خطا در حذف محصول";
//       toast.error(message);
//     } finally {
//       setActionLoadingId(null);
//     }
//   };

//   const openAddDrawer = () => setDrawer({ type: "add", product: null });
//   const openEditDrawer = (product: Product) => setDrawer({ type: "edit", product });
//   const closeDrawer = () => setDrawer({ type: null, product: null });

//   const refreshAfterSave = async () => {
//     closeDrawer();
//     await fetchProducts(page);
//   };

//   const stockBadge = (stock: number) => {
//     if (stock <= 0)
//       return (
//         <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
//           ناموجود
//         </span>
//       );

//     if (stock < 10)
//       return (
//         <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
//           موجودی کم
//         </span>
//       );

//     return (
//       <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
//         موجود
//       </span>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 text-right">
//       <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
//         <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
//           <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
//             <div>
//               <h1 className="text-2xl font-black text-slate-900">مدیریت محصولات</h1>
//               <p className="mt-2 text-sm text-slate-500">
//                 صفحه جدید مدیریت محصولات؛ افزودن، ویرایش، حذف و بررسی وضعیت موجودی
//                 به‌صورت یکجا.
//               </p>
//             </div>

//             <div className="flex flex-col gap-2 sm:flex-row">
//               <button
//                 onClick={() => fetchProducts(page)}
//                 className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
//               >
//                 <RefreshCcw className="h-4 w-4" />
//                 بروزرسانی لیست
//               </button>
//               <button
//                 onClick={openAddDrawer}
//                 className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
//               >
//                 <Plus className="h-4 w-4" />
//                 افزودن محصول جدید
//               </button>
//             </div>
//           </div>
//         </section>

//         <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
//           <StatsCard
//             title="کل محصولات"
//             value={new Intl.NumberFormat("fa-IR").format(stats.total)}
//             icon={Package}
//             color="blue"
//           />
//           <StatsCard
//             title="ارزش موجودی"
//             value={`${formatPrice(stats.value)} تومان`}
//             icon={DollarSign}
//             color="green"
//           />
//           <StatsCard
//             title="موجودی کم"
//             value={new Intl.NumberFormat("fa-IR").format(stats.lowStock)}
//             icon={AlertTriangle}
//             color="amber"
//           />
//           <StatsCard
//             title="نظرات"
//             value={new Intl.NumberFormat("fa-IR").format(stats.comments)}
//             icon={MessageSquare}
//             color="indigo"
//             trend={`در انتظار تایید: ${new Intl.NumberFormat("fa-IR").format(stats.verifiedComments)}`}
//           />
//         </section>

//         <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//           <div className="border-b border-slate-100 p-4 sm:p-6">
//             <div className="grid gap-3 md:grid-cols-[1fr_auto]">
//               <label className="relative block">
//                 <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                 <input
//                   value={query}
//                   onChange={(e) => setQuery(e.target.value)}
//                   placeholder="جستجو با نام، SKU یا دسته‌بندی"
//                   className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
//                 />
//               </label>

//               <select
//               title="stockFilter"
//                 value={stockFilter}
//                 onChange={(e) => setStockFilter(e.target.value as StockFilter)}
//                 className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
//               >
//                 <option value="all">همه وضعیت‌ها</option>
//                 <option value="low">فقط موجودی کم</option>
//                 <option value="out">فقط ناموجود</option>
//               </select>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full min-w-[950px] text-right text-sm">
//               <thead>
//                 <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
//                   <th className="px-4 py-3 font-semibold">محصول</th>
//                   <th className="px-4 py-3 font-semibold">SKU</th>
//                   <th className="px-4 py-3 font-semibold">دسته‌بندی</th>
//                   <th className="px-4 py-3 font-semibold">وضعیت</th>
//                   <th className="px-4 py-3 font-semibold">قیمت</th>
//                   <th className="px-4 py-3 font-semibold">موجودی</th>
//                   <th className="px-4 py-3 font-semibold">آخرین بروزرسانی</th>
//                   <th className="px-4 py-3 font-semibold">عملیات</th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-slate-100">
//                 {loading
//                   ? Array.from({ length: 6 }).map((_, idx) => (
//                       <tr key={idx}>
//                         <td className="px-4 py-3" colSpan={8}>
//                           <Skeleton height={28} />
//                         </td>
//                       </tr>
//                     ))
//                   : filteredProducts.map((product) => (
//                       <tr key={product._id} className="hover:bg-slate-50">
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-3">
//                             <Image
//                               src={product.mainImage}
//                               alt={product.title}
//                               width={48}
//                               height={48}
//                               className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
//                             />
//                             <div>
//                               <p className="font-semibold text-slate-900">{product.title}</p>
//                               <p className="text-xs text-slate-500">{product.brand || "بدون برند"}</p>
//                             </div>
//                           </div>
//                         </td>

//                         <td className="px-4 py-3 text-slate-600">{product.sku || "—"}</td>

//                         <td className="px-4 py-3 text-slate-600">
//                           {product.category?.parent?.name ?? "بدون دسته مادر"} /{" "}
//                           {product.category?.name ?? "—"}
//                         </td>

//                         <td className="px-4 py-3">{stockBadge(product.stock)}</td>

//                         <td className="px-4 py-3 font-semibold text-slate-900">
//                           {formatPrice(product.discountPrice || product.price)} تومان
//                           {product.discountPrice ? (
//                             <span className="mr-2 text-xs font-normal text-slate-400 line-through">
//                               {formatPrice(product.price)}
//                             </span>
//                           ) : null}
//                         </td>

//                         <td className="px-4 py-3 text-slate-600">{product.stock} عدد</td>

//                         <td className="px-4 py-3 text-slate-500">
//                           {new Date(product.updatedAt).toLocaleDateString("fa-IR")}
//                         </td>

//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-1">
//                             <button
//                               onClick={() => openEditDrawer(product)}
//                               className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
//                               title="ویرایش"
//                             >
//                               <Edit2 className="h-4 w-4" />
//                             </button>
//                             <button
//                               onClick={() => handleDelete(product._id)}
//                               disabled={actionLoadingId === product._id}
//                               className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
//                               title="حذف"
//                             >
//                               <Trash2 className="h-4 w-4" />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ))}
//               </tbody>
//             </table>
//           </div>

//           {!loading && filteredProducts.length === 0 && (
//             <div className="p-8 text-center text-sm text-slate-500">
//               موردی مطابق جستجو یا فیلتر انتخابی پیدا نشد.
//             </div>
//           )}

//           <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
//             <span>
//               صفحه {new Intl.NumberFormat("fa-IR").format(page)} از{" "}
//               {new Intl.NumberFormat("fa-IR").format(totalPages)}
//               <span className="mr-2 text-slate-400">
//                 (کل: {new Intl.NumberFormat("fa-IR").format(totalCount)})
//               </span>
//             </span>

//             <div className="flex gap-2">
//               <button
//                 className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
//                 disabled={page === 1 || loading}
//                 onClick={() => setPage((p) => p - 1)}
//               >
//                 قبلی
//               </button>
//               <button
//                 className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
//                 disabled={page === totalPages || loading}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 بعدی
//               </button>
//             </div>
//           </div>
//         </section>
//       </main>

//       {drawer.type === "add" && <AddProductDrawer onClose={closeDrawer} onSave={refreshAfterSave} />}

//       {drawer.type === "edit" && drawer.product && (
//         <AddProductDrawer onClose={closeDrawer} product={drawer.product} onSave={refreshAfterSave} />
//       )}
//     </div>
//   );
// }

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";

import {
  AlertTriangle,
  DollarSign,
  Edit2,
  MessageSquare,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
} from "lucide-react";

import { Product } from "@/types";
import { formatPrice } from "@/helpers/Price";
import StatsCard from "../components/StatsCard";
import AddProductDrawer from "../components/drawers/AddProductDrawer";

type DrawerState = {
  type: "add" | "edit" | null;
  product: Product | null;
};

type StockFilter = "all" | "low" | "out";
type StatusFilter = "all" | "draft" | "published";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    value: 0,
    lowStock: 0,
    comments: 0,
    verifiedComments: 0,
  });

  const [drawer, setDrawer] = useState<DrawerState>({
    type: null,
    product: null,
  });

  const fetchProducts = async (targetPage: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/product?page=${targetPage}&limit=10`);
      if (!res.ok) throw new Error("خطا در دریافت محصولات");

      const data = await res.json();
      setProducts(data.products ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.total ?? 0);
      setStats(data.stats);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت محصولات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(page);
  }, [page]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const normalized = query.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        product.title.toLowerCase().includes(normalized) ||
        product.sku?.toLowerCase().includes(normalized) ||
        product.category?.name?.toLowerCase().includes(normalized);

      if (!matchesSearch) return false;
      if (statusFilter !== "all" && (product.status ?? "published") !== statusFilter)
        return false;
      if (stockFilter === "low") return product.stock > 0 && product.stock < 10;
      if (stockFilter === "out") return product.stock <= 0;
      return true;
    });
  }, [products, query, stockFilter, statusFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/product/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error ?? "حذف محصول ناموفق بود");
      }

      toast.success("محصول با موفقیت حذف شد.");

      const nextCount = products.length - 1;
      if (nextCount <= 0 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        await fetchProducts(page);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در حذف محصول";
      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAddDrawer = () => setDrawer({ type: "add", product: null });
  const openEditDrawer = (product: Product) => setDrawer({ type: "edit", product });
  const closeDrawer = () => setDrawer({ type: null, product: null });

  const refreshAfterSave = async () => {
    closeDrawer();
    await fetchProducts(page);
  };

  const stockBadge = (stock: number) => {
    if (stock <= 0)
      return (
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
          ناموجود
        </span>
      );

    if (stock < 10)
      return (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
          موجودی کم
        </span>
      );

    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        موجود
      </span>
    );
  };

  const statusBadge = (status?: "draft" | "published") => {
    if (status === "draft")
      return (
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
          پیش‌نویس
        </span>
      );

    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
        منتشر شده
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-right">
      <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900">مدیریت محصولات</h1>
              <p className="mt-2 text-sm text-slate-500">
                صفحه جدید مدیریت محصولات؛ افزودن، ویرایش، حذف و بررسی وضعیت موجودی
                به‌صورت یکجا.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => fetchProducts(page)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <RefreshCcw className="h-4 w-4" />
                بروزرسانی لیست
              </button>
              <button
                onClick={openAddDrawer}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                افزودن محصول جدید
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            title="کل محصولات"
            value={new Intl.NumberFormat("fa-IR").format(stats.total)}
            icon={Package}
            color="blue"
          />
          <StatsCard
            title="ارزش موجودی"
            value={`${formatPrice(stats.value)} تومان`}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="موجودی کم"
            value={new Intl.NumberFormat("fa-IR").format(stats.lowStock)}
            icon={AlertTriangle}
            color="amber"
          />
          <StatsCard
            title="نظرات"
            value={new Intl.NumberFormat("fa-IR").format(stats.comments)}
            icon={MessageSquare}
            color="indigo"
            trend={`در انتظار تایید: ${new Intl.NumberFormat("fa-IR").format(stats.verifiedComments)}`}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجو با نام، SKU یا دسته‌بندی"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
                />
              </label>

              <select
              title="stockFilter"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
              >
                <option value="all">همه موجودی‌ها</option>
                <option value="low">فقط موجودی کم</option>
                <option value="out">فقط ناموجود</option>
              </select>

              <select
                title="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="published">منتشر شده</option>
                <option value="draft">پیش‌نویس</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <th className="px-4 py-3 font-semibold">محصول</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">دسته‌بندی</th>
                  <th className="px-4 py-3 font-semibold">وضعیت انتشار</th>
                  <th className="px-4 py-3 font-semibold">وضعیت موجودی</th>
                  <th className="px-4 py-3 font-semibold">قیمت</th>
                  <th className="px-4 py-3 font-semibold">موجودی</th>
                  <th className="px-4 py-3 font-semibold">آخرین بروزرسانی</th>
                  <th className="px-4 py-3 font-semibold">عملیات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3" colSpan={9}>
                          <Skeleton height={28} />
                        </td>
                      </tr>
                    ))
                  : filteredProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Image
                              src={product.mainImage}
                              alt={product.title}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{product.title}</p>
                              <p className="text-xs text-slate-500">{product.brand || "بدون برند"}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">{product.sku || "—"}</td>

                        <td className="px-4 py-3 text-slate-600">
                          {product.category?.parent?.name ?? "بدون دسته مادر"} /{" "}
                          {product.category?.name ?? "—"}
                        </td>

                        <td className="px-4 py-3">{statusBadge(product.status)}</td>

                        <td className="px-4 py-3">{stockBadge(product.stock)}</td>

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {formatPrice(product.discountPrice || product.price)} تومان
                          {product.discountPrice ? (
                            <span className="mr-2 text-xs font-normal text-slate-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 text-slate-600">{product.stock} عدد</td>

                        <td className="px-4 py-3 text-slate-500">
                          {new Date(product.updatedAt).toLocaleDateString("fa-IR")}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditDrawer(product)}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
                              title="ویرایش"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id)}
                              disabled={actionLoadingId === product._id}
                              className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!loading && filteredProducts.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              موردی مطابق جستجو یا فیلتر انتخابی پیدا نشد.
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span>
              صفحه {new Intl.NumberFormat("fa-IR").format(page)} از{" "}
              {new Intl.NumberFormat("fa-IR").format(totalPages)}
              <span className="mr-2 text-slate-400">
                (کل: {new Intl.NumberFormat("fa-IR").format(totalCount)})
              </span>
            </span>

            <div className="flex gap-2">
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                disabled={page === totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </button>
            </div>
          </div>
        </section>
      </main>

      {drawer.type === "add" && <AddProductDrawer onClose={closeDrawer} onSave={refreshAfterSave} />}

      {drawer.type === "edit" && drawer.product && (
        <AddProductDrawer onClose={closeDrawer} product={drawer.product} onSave={refreshAfterSave} />
      )}
    </div>
  );
}

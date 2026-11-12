"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import ProductImage from "@/app/components/ProductImage";

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

import type { Category, Product } from "@/types";
import { formatPrice } from "@/helpers/Price";
import StatsCard from "../components/StatsCard";
import AddProductDrawer from "../components/drawers/AddProductDrawer";

type AdminProduct = Product & {
  purchasePrice: number | null;
  inventoryProfit: number | null;
  missingPurchasePrice: boolean;
};

type DrawerState = {
  type: "add" | "edit" | null;
  product: AdminProduct | null;
};

type StockFilter = "all" | "in" | "low" | "out";
type StatusFilter = "all" | "draft" | "published";

type ProductList = {
  products: AdminProduct[];
  page: number;
  totalPages: number;
  total: number;
};

type ProductRequest = {
  key: string;
  list: ProductList | null;
};

const filterClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring";

const categoryLabel = (category: Category) =>
  category.parent ? `${category.parent.name} / ${category.name}` : category.name;

export default function ProductsPage() {
  const [request, setRequest] = useState<ProductRequest | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [missingPurchasePrice, setMissingPurchasePrice] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoriesError, setCategoriesError] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const statsVersion = useRef(-1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    total: 0,
    value: 0,
    lowStock: 0,
    knownInventoryProfit: 0,
    missingPurchasePriceProducts: 0,
    comments: 0,
    verifiedComments: 0,
  });

  const [drawer, setDrawer] = useState<DrawerState>({
    type: null,
    product: null,
  });

  const trimmedQuery = query.trim();
  const searchPending = trimmedQuery !== debouncedQuery;
  const params = new URLSearchParams({ page: String(page) });
  if (debouncedQuery) params.set("q", debouncedQuery);
  if (stockFilter !== "all") params.set("stock", stockFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (categoryFilter) params.set("category", categoryFilter);
  if (missingPurchasePrice) params.set("missingPurchasePrice", "true");
  const queryString = params.toString();
  const requestKey = `${refreshVersion}:${queryString}`;
  const loading = searchPending || request?.key !== requestKey;
  const result = loading ? null : request?.list;
  const failed = !loading && !result;
  const hasFilters = Boolean(
    trimmedQuery || stockFilter !== "all" || statusFilter !== "all" || categoryFilter || missingPurchasePrice,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(trimmedQuery), 300);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        const response = await fetch("/api/admin/category", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("خطا در دریافت دسته‌بندی‌ها");
        const data: Category[] = await response.json();
        if (controller.signal.aborted) return;
        setCategories(
          data.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), "fa")),
        );
        setCategoriesError(false);
      } catch {
        if (!controller.signal.aborted) setCategoriesError(true);
      }
    }

    void loadCategories();
    return () => controller.abort();
  }, [refreshVersion]);

  useEffect(() => {
    if (searchPending) return;
    const controller = new AbortController();

    async function loadProducts() {
      const includeStats = statsVersion.current !== refreshVersion;
      try {
        const response = await fetch(
          `/api/admin/product?${queryString}&includeStats=${includeStats}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("خطا در دریافت محصولات");
        const data: ProductList & { stats?: typeof stats } = await response.json();
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, list: data });
        if (data.stats) {
          setStats(data.stats);
          statsVersion.current = refreshVersion;
        }
      } catch {
        if (!controller.signal.aborted) setRequest({ key: requestKey, list: null });
      }
    }

    void loadProducts();
    return () => controller.abort();
  }, [queryString, refreshVersion, requestKey, searchPending]);

  const refreshProducts = () => setRefreshVersion((version) => version + 1);

  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setStockFilter("all");
    setStatusFilter("all");
    setCategoryFilter("");
    setMissingPurchasePrice(false);
    setPage(1);
  };

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

      toast.success("محصول از فروشگاه حذف شد.");

      refreshProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا در حذف محصول";
      toast.error(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openAddDrawer = () => setDrawer({ type: "add", product: null });
  const openEditDrawer = (product: AdminProduct) =>
    setDrawer({ type: "edit", product });
  const closeDrawer = () => setDrawer({ type: null, product: null });

  const refreshAfterSave = () => {
    closeDrawer();
    refreshProducts();
  };

  const stockBadge = (stock: number) => {
    if (!(stock > 0))
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
    if (status !== "published")
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
              <h1 className="text-2xl font-black text-slate-900">
                مدیریت محصولات
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                صفحه جدید مدیریت محصولات؛ افزودن، ویرایش، حذف و بررسی وضعیت
                موجودی به‌صورت یکجا.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={refreshProducts}
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

        <section className="grid gap-3 sm:grid-cols-2" aria-label="سود موجودی">
          <StatsCard
            title="سود بالقوه موجودی با قیمت خرید ثبت‌شده"
            value={`${formatPrice(stats.knownInventoryProfit)} تومان`}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="محصولات بدون قیمت خرید کامل"
            value={stats.missingPurchasePriceProducts.toLocaleString("fa-IR")}
            icon={AlertTriangle}
            color="amber"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">جستجوی محصول</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  dir="auto"
                  maxLength={120}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="نام محصول، SKU، بارکد یا دسته‌بندی"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-right text-sm text-slate-700 outline-none ring-indigo-200 transition focus:border-indigo-400 focus:ring"
                />
              </span>
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="product-filter-category" className="mb-1.5 block text-sm font-medium text-slate-700">
                  دسته‌بندی
                </label>
                <select
                  id="product-filter-category"
                  value={categoryFilter}
                  disabled={!categories}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className={filterClass}
                >
                  <option value="">همه دسته‌بندی‌ها</option>
                  {categories?.map((category) => (
                    <option key={category._id} value={category._id}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="product-filter-stock" className="mb-1.5 block text-sm font-medium text-slate-700">
                  موجودی
                </label>
                <select
                  id="product-filter-stock"
                  value={stockFilter}
                  onChange={(e) => {
                    setStockFilter(e.target.value as StockFilter);
                    setPage(1);
                  }}
                  className={filterClass}
                >
                  <option value="all">همه موجودی‌ها</option>
                  <option value="in">موجود (حداقل ۱ عدد)</option>
                  <option value="low">موجودی کم (۱ تا ۹ عدد)</option>
                  <option value="out">ناموجود</option>
                </select>
              </div>

              <div className="min-w-0">
                <label htmlFor="product-filter-status" className="mb-1.5 block text-sm font-medium text-slate-700">
                  وضعیت انتشار
                </label>
                <select
                  id="product-filter-status"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className={filterClass}
                >
                  <option value="all">همه وضعیت‌ها</option>
                  <option value="published">منتشر شده</option>
                  <option value="draft">پیش‌نویس</option>
                </select>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={missingPurchasePrice}
                onChange={(event) => {
                  setPage(1);
                  setMissingPurchasePrice(event.target.checked);
                }}
              />
              محصولات بدون قیمت خرید
            </label>

            {categoriesError && (
              <p className="mt-3 text-sm text-red-700" role="status">
                دسته‌بندی‌ها دریافت نشدند. برای تلاش دوباره، فهرست را به‌روزرسانی کنید.
              </p>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 rounded-lg px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
              >
                پاک کردن جستجو و فیلترها
              </button>
            )}
          </div>

          <div className="overflow-x-auto" aria-busy={loading}>
            <table className="w-full min-w-[950px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                  <th className="px-4 py-3 font-semibold">محصول</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">دسته‌بندی</th>
                  <th className="px-4 py-3 font-semibold">وضعیت انتشار</th>
                  <th className="px-4 py-3 font-semibold">وضعیت موجودی</th>
                  <th className="px-4 py-3 font-semibold">قیمت</th>
                  <th className="px-4 py-3 font-semibold">قیمت خرید</th>
                  <th className="px-4 py-3 font-semibold">سود بالقوه موجودی</th>
                  <th className="px-4 py-3 font-semibold">موجودی</th>
                  <th className="px-4 py-3 font-semibold">آخرین بروزرسانی</th>
                  <th className="px-4 py-3 font-semibold">عملیات</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3" colSpan={11}>
                          <Skeleton height={28} />
                        </td>
                      </tr>
                    ))
                  : result?.products.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ProductImage
                              src={product.mainImage}
                              alt={product.title}
                              width={48}
                              height={48}
                              sizes="48px"
                              className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">
                                {product.title}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs text-slate-500">
                                  {product.brand || "بدون برند"}
                                </span>
                                {product.productType === "multi" && (
                                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                                    {product.variants?.filter((v) => v.isActive !== false).length || 0} مدل
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {product.sku || "—"}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {product.category?.parent?.name ?? "بدون دسته مادر"} /{" "}
                          {product.category?.name ?? "—"}
                        </td>

                        <td className="px-4 py-3">
                          {statusBadge(product.status)}
                        </td>

                        <td className="px-4 py-3">
                          {stockBadge(product.stock)}
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {product.productType === "multi" ? "از " : ""}
                          {formatPrice(product.discountPrice ?? product.price)}{" "}
                          تومان
                          {product.discountPrice != null ? (
                            <span className="mr-2 text-xs font-normal text-slate-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {product.productType === "multi"
                            ? (product.missingPurchasePrice ? "ناقص در مدل‌ها" : "ثبت‌شده برای مدل‌ها")
                            : (product.purchasePrice === null ? "ثبت نشده" : `${formatPrice(product.purchasePrice)} تومان`)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {product.inventoryProfit === null
                            ? "نامشخص"
                            : `${formatPrice(product.inventoryProfit)} تومان`}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {product.stock ?? 0} عدد
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {new Date(product.updatedAt).toLocaleDateString(
                            "fa-IR",
                          )}
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

          {failed && (
            <div className="p-8 text-center text-sm text-red-700" role="alert">
              فهرست محصولات دریافت نشد.
              <button type="button" onClick={refreshProducts} className="mr-2 underline">
                تلاش دوباره
              </button>
            </div>
          )}

          {result?.total === 0 && (
            <div className="p-8 text-center text-sm text-slate-500" role="status">
              {hasFilters
                ? "محصولی مطابق جستجو و فیلترهای انتخاب‌شده پیدا نشد."
                : "هنوز محصولی ثبت نشده است."}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <span role="status">
                {result.total.toLocaleString("fa-IR")} محصول
                {result.total > 0 && (
                  <span className="mr-2 text-slate-500">
                    (صفحه {result.page.toLocaleString("fa-IR")} از {result.totalPages.toLocaleString("fa-IR")})
                  </span>
                )}
              </span>

              {result.totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                    disabled={result.page <= 1}
                    onClick={() => setPage(result.page - 1)}
                  >
                    قبلی
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-50"
                    disabled={result.page >= result.totalPages}
                    onClick={() => setPage(result.page + 1)}
                  >
                    بعدی
                  </button>
                </div>
              )}
            </div>
          )}

        </section>
      </main>

      {drawer.type === "add" && (
        <AddProductDrawer onClose={closeDrawer} onSave={refreshAfterSave} />
      )}

      {drawer.type === "edit" && drawer.product && (
        <AddProductDrawer
          onClose={closeDrawer}
          product={drawer.product}
          onSave={refreshAfterSave}
        />
      )}
    </div>
  );
}

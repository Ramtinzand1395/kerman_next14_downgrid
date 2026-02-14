
"use client";
import Image from "next/image";
import { Product } from "@/types";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";

import {
  AlertTriangle,
  DollarSign,
  Edit2,
  MessageSquare,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import StatsCard from "../components/StatsCard";
import AddProductDrawer from "../components/drawers/AddProductDrawer";
import { formatPrice } from "@/helpers/Price";

type DrawerState = {
  type: "add" | "edit" | null;
  product: Product | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [stats, setStats] = useState({
    total: 0,
    value: 0,
    lowStock: 0,
    comments: 0,
    verifiedComments: 0,
  });

  const fetchProducts = async (page: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/product?page=${page}&limit=10`);
      if (!res.ok) throw new Error("خطا در دریافت محصولات");
      const data = await res.json();
      setProducts(data.products);
      setTotalPages(data.totalPages);
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

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/product/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("خطا در حذف محصول");

      toast.success("محصول با موفقیت حذف شد.");

      // حذف از UI بدون رفرش
      setProducts((prev) => prev.filter((p) => p._id !== id));

      // اگر بخواهی از سرور هم sync شود
      // router.refresh();
    } catch (err) {
      toast.error("❌ خطا در حذف محصول");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [drawer, setDrawer] = useState<DrawerState>({
    type: null,
    product: null,
  });

  // باز کردن مدال افزودن
  const openAddDrawer = () => setDrawer({ type: "add", product: null });

  // باز کردن مدال ویرایش
  const openEditDrawer = (product: Product) =>
    setDrawer({ type: "edit", product });

  // بستن هر مدال
  const closeDrawer = () => setDrawer({ type: null, product: null });
  return (
    <div className="min-h-screen bg-gray-50 text-right">
      <main className="p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">لیست محصولات</h1>
            <p className="mt-1 text-sm text-gray-500">
              مدیریت موجودی و قیمت‌گذاری محصولات فروشگاه
            </p>
          </div>
          <button
            onClick={openAddDrawer}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            افزودن محصول جدید
          </button>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="کل محصولات"
            value={new Intl.NumberFormat("fa-IR").format(stats.total)}
            icon={Package}
            color="blue"
            trend="+12%"
          />
          <StatsCard
            title="ارزش موجودی"
            value={`${formatPrice(stats.value)} تومان`}
            icon={DollarSign}
            color="green"
            trend="+5%"
          />
          <StatsCard
            title="موجودی کم"
            value={new Intl.NumberFormat("fa-IR").format(stats.lowStock)}
            icon={AlertTriangle}
            color="amber"
          />
          <StatsCard
            title=" نظرات"
            value={new Intl.NumberFormat("fa-IR").format(stats.comments)}
            icon={MessageSquare}
            color="indigo"
            trend={new Intl.NumberFormat("fa-IR").format(
              stats.verifiedComments
            )}
          />
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium text-gray-500">محصول</th>
                  <th className="px-6 py-4 font-medium text-gray-500">
                    دسته‌بندی
                  </th>
                  <th className="px-6 py-4 font-medium text-gray-500">وضعیت</th>
                  <th className="px-6 py-4 font-medium text-gray-500">قیمت</th>
                  <th className="px-6 py-4 font-medium text-gray-500">
                    موجودی
                  </th>
                  <th className="px-6 py-4 font-medium text-gray-500">
                    آخرین بروزرسانی
                  </th>
                  <th className="px-6 py-4 font-medium text-gray-500">
                    عملیات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading
                  ? Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            <Skeleton
                              width={100}
                              height={20}
                              baseColor="#dbeafe"
                              highlightColor="#bfdbfe"
                              borderRadius={8}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  : products.map((product) => (
                      <tr
                        key={product._id}
                        className="group hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center gap-3">
                            <Image
                              src={product.mainImage}
                              alt={product.title}
                              width={50}
                              height={50}
                              className="h-10 w-10 rounded-lg object-cover ring-1 ring-gray-100"
                            />
                            <span className="font-medium text-gray-900 whitespace-nowrap">
                              {product.title}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {product.category?.parent?.name ?? "مادر"} /{" "}
                          {product.category?.name ?? "—"}
                        </td>

                        <td className="px-6 py-4"></td>

                        <td className="px-6 py-4 font-medium text-gray-900">
                          {formatPrice(product.price)} تومان
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${
                                  product.stock < 10
                                    ? "bg-amber-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(product.stock * 2, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs">{product.stock} عدد</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-gray-500">
                          {new Date(product.updatedAt).toLocaleDateString(
                            "fa-IR"
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditDrawer(product)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product._id)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
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

          {/* Pagination (Visual only) */}
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <span className="text-sm text-gray-500">
              نمایش 1 تا {products.length} از {products.length} نتیجه
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </button>
              <button
                className="rounded-lg border border-gray-200 px-3 py-1 text-sm text-gray-600 disabled:opacity-50"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </button>
            </div>
          </div>
        </div>
      </main>

      {drawer.type === "add" && (
        <AddProductDrawer
          onClose={closeDrawer}
          onSave={(newProduct) => setProducts((prev) => [...prev, newProduct])}
        />
      )}

      {drawer.type === "edit" && drawer.product && (
        <AddProductDrawer
          onClose={closeDrawer}
          product={drawer.product}
          onSave={(updatedProduct) => {
            setProducts((prev) =>
              prev.map((p) =>
                p._id === updatedProduct._id ? updatedProduct : p
              )
            );
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ProductImage from "@/app/components/ProductImage";

interface Favorite {
  _id: string;
  createdAt: string;
  productId?: {
    _id: string;
    title: string;
    mainImage: string;
  };
}

interface User {
  _id: string;
  username?: string;
  email?: string;
  mobile: string;
  role: "user" | "admin" | "superadmin";
  addressCount: number;
  favorites?: Favorite[];
  commentCount: number;
  successfulOrders: number;
  totalPurchase: number;
  createdAt: string;
  updatedAt?: string;
}

interface Summary {
  totalUsers: number;
  regularUsers: number;
  admins: number;
  successfulOrders: number;
  totalComments: number;
}

interface UsersResponse {
  users: User[];
  summary: Summary;
  total: number;
  page: number;
  pages: number;
}

const emptySummary: Summary = {
  totalUsers: 0,
  regularUsers: 0,
  admins: 0,
  successfulOrders: 0,
  totalComments: 0,
};

const roleLabel: Record<User["role"], string> = {
  user: "کاربر",
  admin: "ادمین",
  superadmin: "سوپر ادمین",
};

const roleBadge: Record<User["role"], string> = {
  user: "bg-slate-100 text-slate-700",
  admin: "bg-indigo-100 text-indigo-700",
  superadmin: "bg-rose-100 text-rose-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "12",
        });
        if (debouncedQuery) params.set("query", debouncedQuery);
        if (roleFilter !== "all") params.set("role", roleFilter);

        const res = await fetch(`/api/admin/user?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("فهرست کاربران دریافت نشد.");
        const data: UsersResponse = await res.json();
        setUsers(data.users);
        setSummary(data.summary);
        setTotal(data.total);
        setPages(data.pages);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        toast.error("فهرست کاربران دریافت نشد؛ صفحه را تازه‌سازی کنید.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchUsers();
    return () => controller.abort();
  }, [debouncedQuery, page, roleFilter]);

  const overview = useMemo(() => {
    return [
      {
        label: "کل کاربران",
        value: summary.totalUsers.toLocaleString("fa-IR"),
        tone: "from-slate-100 to-slate-50",
      },
      {
        label: "کاربران عادی",
        value: summary.regularUsers.toLocaleString("fa-IR"),
        tone: "from-emerald-100 to-emerald-50",
      },
      {
        label: "ادمین‌ها",
        value: summary.admins.toLocaleString("fa-IR"),
        tone: "from-indigo-100 to-indigo-50",
      },
      {
        label: "سفارش‌های موفق",
        value: summary.successfulOrders.toLocaleString("fa-IR"),
        tone: "from-amber-100 to-amber-50",
      },
      {
        label: "مجموع کامنت‌ها",
        value: summary.totalComments.toLocaleString("fa-IR"),
        tone: "from-violet-100 to-violet-50",
      },
    ];
  }, [summary]);

  return (
    <section className="space-y-6 p-4 md:p-6">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white shadow-sm">
        <h1 className="mt-2 text-2xl font-bold md:text-3xl text-white">
          مدیریت کاربران
        </h1>

        <p className="mt-2 text-sm text-slate-200 md:text-base">
          کاربران را جستجو کنید، براساس نقش فیلتر کنید و جزئیات فعالیت هر کاربر
          را سریع‌تر ببینید.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <Skeleton height={20} width={80} />
                <Skeleton height={32} className="mt-3" />
              </div>
            ))
          : overview.map((card) => (
              <article
                key={card.label}
                className={`rounded-xl border border-slate-200 bg-gradient-to-b ${card.tone} p-4 shadow-sm`}
              >
                <p className="text-sm text-slate-600">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {card.value}
                </p>
              </article>
            ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="جستجو با نام، شماره موبایل یا ایمیل"
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-400"
          />
          <select
            title="role"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as "all" | User["role"]);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-400"
          >
            <option value="all">همه نقش‌ها</option>
            <option value="user">کاربر</option>
            <option value="admin">ادمین</option>
            <option value="superadmin">سوپر ادمین</option>
          </select>
          <div className="flex h-11 items-center justify-center rounded-xl bg-slate-100 px-4 text-sm text-slate-600">
            {loading
              ? "در حال بارگذاری..."
              : `${total.toLocaleString("fa-IR")} کاربر یافت شد`}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <Skeleton height={24} width={140} />
                <Skeleton height={18} width={100} className="mt-2" />
                <Skeleton count={3} className="mt-3" />
              </div>
            ))
          : users.map((user) => (
              <article
                key={user._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {user.username || "بدون نام کاربری"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{user.mobile}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {user.email || "ایمیل ثبت نشده"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadge[user.role]}`}
                  >
                    {roleLabel[user.role]}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">آدرس</dt>
                    <dd className="text-base font-bold text-slate-900">
                      {user.addressCount.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">سفارش موفق</dt>
                    <dd className="text-base font-bold text-slate-900">
                      {user.successfulOrders.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">کامنت</dt>
                    <dd className="text-base font-bold text-slate-900">
                      {user.commentCount.toLocaleString("fa-IR")}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    تاریخ عضویت:{" "}
                    {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                  <p>
                    مجموع خرید:{" "}
                    {user.totalPurchase.toLocaleString("fa-IR")}{" "}
                    تومان
                  </p>
                </div>

                {!!user.favorites?.length && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-slate-700">
                      علاقه‌مندی‌های اخیر
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.favorites.slice(0, 4).map((favorite) => (
                        <div
                          key={favorite._id}
                          className="relative h-12 w-12 overflow-hidden rounded-md border border-slate-200 bg-slate-50"
                        >
                          <ProductImage
                            src={favorite.productId?.mainImage}
                            alt={favorite.productId?.title || "محصول"}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
      </div>

      {!loading && users.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          کاربری با این مشخصات پیدا نشد.
        </div>
      )}

      {!loading && pages > 1 && (
        <nav
          aria-label="صفحه‌بندی کاربران"
          className="flex items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            قبلی
          </button>
          <span className="text-sm text-slate-600">
            صفحه {page.toLocaleString("fa-IR")} از {pages.toLocaleString("fa-IR")}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(pages, current + 1))}
            disabled={page === pages}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            بعدی
          </button>
        </nav>
      )}
    </section>
  );
}

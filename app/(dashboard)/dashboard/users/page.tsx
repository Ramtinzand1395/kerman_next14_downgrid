"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

interface Address {
  _id: string;
  province: string;
  city: string;
  address: string;
  plaque?: string;
  unit?: string;
  postalCode?: string;
}

interface Favorite {
  _id: string;
  createdAt: string;
  productId?: {
    _id: string;
    title: string;
    mainImage: string;
  };
}

interface Comment {
  _id: string;
  text: string;
  rating?: number;
  verified: boolean;
  createdAt: string;
  product?: {
    _id: string;
    title: string;
    mainImage: string;
  };
}

interface Order {
  _id: string;
  createdAt: string;
  finalPrice: number;
  status: string;
}

interface User {
  _id: string;
  username?: string;
  email?: string;
  mobile: string;
  role: "user" | "admin" | "superadmin";
  addresses?: Address[];
  favorites?: Favorite[];
  comments?: Comment[];
  orders?: Order[];
  createdAt: string;
  updatedAt?: string;
}

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
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/user");
        if (!res.ok) throw new Error("خطای سرور");
        const data: { users: User[] } = await res.json();
        setUsers(data.users);
      } catch (error) {
        console.error(error);
        toast.error("دریافت اطلاعات کاربران با خطا مواجه شد");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const isRoleMatch = roleFilter === "all" || user.role === roleFilter;
      const searchable = [user.username, user.mobile, user.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const isQueryMatch =
        normalizedQuery.length === 0 || searchable.includes(normalizedQuery);

      return isRoleMatch && isQueryMatch;
    });
  }, [users, query, roleFilter]);

  const overview = useMemo(() => {
    const totals = users.reduce(
      (acc, user) => {
        acc[user.role] += 1;
        acc.orders += user.orders?.length || 0;
        acc.comments += user.comments?.length || 0;
        return acc;
      },
      { user: 0, admin: 0, superadmin: 0, orders: 0, comments: 0 },
    );

    return [
      {
        label: "کل کاربران",
        value: users.length.toLocaleString(),
        tone: "from-slate-100 to-slate-50",
      },
      {
        label: "کاربران عادی",
        value: totals.user.toLocaleString(),
        tone: "from-emerald-100 to-emerald-50",
      },
      {
        label: "ادمین‌ها",
        value: (totals.admin + totals.superadmin).toLocaleString(),
        tone: "from-indigo-100 to-indigo-50",
      },
      {
        label: "مجموع سفارش‌ها",
        value: totals.orders.toLocaleString(),
        tone: "from-amber-100 to-amber-50",
      },
      {
        label: "مجموع کامنت‌ها",
        value: totals.comments.toLocaleString(),
        tone: "from-violet-100 to-violet-50",
      },
    ];
  }, [users]);

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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جستجو با نام، شماره موبایل یا ایمیل"
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-indigo-400"
          />
          <select
            title="role"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | User["role"])
            }
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
              : `${filteredUsers.length.toLocaleString()} کاربر یافت شد`}
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
          : filteredUsers.map((user) => (
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
                      {user.addresses?.length || 0}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">سفارش</dt>
                    <dd className="text-base font-bold text-slate-900">
                      {user.orders?.length || 0}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs text-slate-500">کامنت</dt>
                    <dd className="text-base font-bold text-slate-900">
                      {user.comments?.length || 0}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p>
                    آخرین عضویت:{" "}
                    {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                  <p>
                    مجموع خرید:{" "}
                    {user.orders
                      ?.reduce((sum, order) => sum + order.finalPrice, 0)
                      .toLocaleString() || 0}{" "}
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
                          {favorite.productId?.mainImage ? (
                            <Image
                              src={favorite.productId.mainImage}
                              alt={favorite.productId.title}
                              fill
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ))}
      </div>

      {!loading && filteredUsers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          کاربری با این مشخصات پیدا نشد.
        </div>
      )}
    </section>
  );
}

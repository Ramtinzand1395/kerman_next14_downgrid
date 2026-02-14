"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Image from "next/image";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// TypeScript Types
export interface Address {
  _id: string;
  province: string;
  city: string;
  address: string;
  plaque?: string;
  unit?: string;
  postalCode?: string;
}

export interface Favorite {
  _id: string;
  createdAt: string;
  productId?: {
    _id: string;
    title: string;
    mainImage: string;
  };
}

export interface Comment {
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

export interface Order {
  _id: string;
  createdAt: string;
  finalPrice: number;
  status: string;
}

export interface User {
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

// Component
export default function page () {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/user`);
        if (!res.ok) throw new Error("خطای سرور");
        const data: { users: User[] } = await res.json();
        setUsers(data.users);
      } catch (err) {
        console.error(err);
        toast.error("خطای سرور");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">داشبورد کاربران</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b">#</th>
              <th className="py-2 px-4 border-b">نام کاربری</th>
              <th className="py-2 px-4 border-b">موبایل</th>
              <th className="py-2 px-4 border-b">ایمیل</th>
              <th className="py-2 px-4 border-b">نقش</th>
              <th className="py-2 px-4 border-b">آدرس‌ها</th>
              <th className="py-2 px-4 border-b">سفارش‌ها</th>
              <th className="py-2 px-4 border-b">کامنت‌ها</th>
              <th className="py-2 px-4 border-b">علاقه‌مندی‌ها</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="py-2 px-4 border-b">
                        <Skeleton />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((user, index) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{index + 1}</td>
                    <td className="py-2 px-4 border-b">{user.username || "—"}</td>
                    <td className="py-2 px-4 border-b">{user.mobile}</td>
                    <td className="py-2 px-4 border-b">{user.email || "—"}</td>
                    <td className="py-2 px-4 border-b">{user.role}</td>

                    {/* آدرس‌ها */}
                    <td className="py-2 px-4 border-b">
                      {user.addresses?.length ? (
                        <ul className="space-y-1 text-sm">
                          {user.addresses.map((addr) => (
                            <li key={addr._id}>
                              {addr.province}, {addr.city}, {addr.address}{" "}
                              {addr.plaque && `, پلاک: ${addr.plaque}`}
                              {addr.unit && `, واحد: ${addr.unit}`}
                              {addr.postalCode && `, کدپستی: ${addr.postalCode}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* سفارش‌ها */}
                    <td className="py-2 px-4 border-b">
                      {user.orders?.length ? (
                        <ul className="space-y-1 text-sm">
                          {user.orders.map((order) => (
                            <li key={order._id}>
                              {order.status} — {order.finalPrice.toLocaleString()} تومان
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* کامنت‌ها */}
                    <td className="py-2 px-4 border-b">
                      {user.comments?.length ? (
                        <ul className="space-y-1 text-sm">
                          {user.comments.map((cmt) => (
                            <li key={cmt._id}>
                              <strong>{cmt.product?.title || "—"}</strong>: {cmt.text}{" "}
                              {cmt.rating && ` — امتیاز: ${cmt.rating}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* علاقه‌مندی‌ها */}
                    <td className="py-2 px-4 border-b">
                      {user.favorites?.length ? (
                        <ul className="flex flex-wrap gap-2">
                          {user.favorites.map((fav) => (
                            <div
                              key={fav._id}
                              className="w-16 h-16 relative border rounded overflow-hidden"
                            >
                              {fav.productId?.mainImage && (
                                <Image
                                  src={fav.productId.mainImage}
                                  alt={fav.productId.title}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </ul>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


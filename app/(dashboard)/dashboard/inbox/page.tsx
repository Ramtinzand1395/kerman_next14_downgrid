"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  Bell,
  Check,
  Eye,
  MessageCircle,
  Package,
  RefreshCcw,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CommentModal from "./modal/CommentModal";
import UserModal from "./modal/UserModal";
import { Notification, User, Comment } from "@/types/notifType";
import OrderModal from "./modal/OrderModal";
import { Order } from "@/types";
import { toPersianDate } from "@/helpers/toPersianDate";

type FilterMode = "all" | "unread" | "read";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const fetchNotif = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) throw new Error("خطا در دریافت پیام‌ها");

      const data = await res.json();
      setNotifications(data);
    } catch {
      toast.error("خطا در دریافت پیام‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotif();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("خطا در علامت‌گذاری به عنوان خوانده شده");

      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
    } catch {
      toast.error("خطا در علامت‌گذاری نوتیفیکیشن");
    }
  };

  const openModal = async (notification: Notification) => {
    setSelected(notification);
    setIsModalOpen(true);

    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  function isCommentNotification(
    notification: Notification
  ): notification is Notification & { target: { kind: "Comment"; item: Comment } } {
    return notification.target.kind === "Comment";
  }

  function isUserNotification(
    notification: Notification
  ): notification is Notification & { target: { kind: "User"; item: User } } {
    return notification.target.kind === "User";
  }

  function isOrderNotification(
    notification: Notification
  ): notification is Notification & { target: { kind: "Order"; item: Order } } {
    return notification.target.kind === "Order";
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return notifications.filter((item) => {
      if (filterMode === "unread" && item.isRead) return false;
      if (filterMode === "read" && !item.isRead) return false;

      if (!normalizedSearch) return true;

      return (
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.message.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [filterMode, notifications, search]);

  const typeMeta: Record<Notification["type"], { label: string; icon: ReactElement }> = {
    comment: { label: "کامنت", icon: <MessageCircle size={14} /> },
    order: { label: "سفارش", icon: <Package size={14} /> },
    user: { label: "کاربر", icon: <UserPlus size={14} /> },
    payment: { label: "پرداخت", icon: <Package size={14} /> },
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold md:text-xl">
            <Bell size={20} /> مرکز پیام مدیریت
          </h2>
          <button
            onClick={fetchNotif}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCcw size={16} /> بروزرسانی
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm md:gap-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-xs text-gray-500">کل پیام‌ها</p>
            <p className="mt-1 text-lg font-bold">{notifications.length}</p>
          </div>
          <div className="rounded-xl bg-yellow-50 p-3">
            <p className="text-xs text-yellow-700">خوانده‌نشده</p>
            <p className="mt-1 text-lg font-bold text-yellow-800">{unreadCount}</p>
          </div>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-700">خوانده‌شده</p>
            <p className="mt-1 text-lg font-bold text-green-800">
              {notifications.length - unreadCount}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs md:text-sm">
            {[
              { key: "all", label: "همه" },
              { key: "unread", label: "خوانده‌نشده" },
              { key: "read", label: "خوانده‌شده" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterMode(tab.key as FilterMode)}
                className={`rounded-md px-3 py-1.5 transition ${
                  filterMode === tab.key ? "bg-white font-semibold shadow" : "text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:max-w-xs">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 py-2 pr-9 pl-3 text-sm outline-none transition focus:border-blue-400"
              placeholder="جستجو در عنوان یا متن..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-3"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton width={140} height={16} />
                  <Skeleton width={260} height={12} />
                  <Skeleton width={100} height={12} />
                </div>
                <Skeleton circle width={26} height={26} />
              </div>
            ))
          : filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`rounded-xl border p-3 transition md:p-4 ${
                  item.isRead ? "border-gray-200 bg-white" : "border-yellow-300 bg-yellow-50/70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {typeMeta[item.type]?.label}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        {typeMeta[item.type]?.icon}
                        {toPersianDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="truncate font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.message}</p>
                  </div>

                  {!item.isRead && (
                    <button
                      title="علامت‌گذاری به عنوان خوانده‌شده"
                      onClick={() => markAsRead(item._id)}
                      className="rounded-lg p-2 text-green-700 hover:bg-green-100"
                    >
                      <Check size={18} />
                    </button>
                  )}
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => openModal(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <Eye size={14} /> مشاهده جزئیات
                  </button>
                </div>
              </div>
            ))}

        {!loading && filteredNotifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            پیامی مطابق فیلتر فعلی پیدا نشد.
          </div>
        )}
      </div>

      {isModalOpen && selected && isCommentNotification(selected) && (
        <CommentModal selected={selected} closeModal={closeModal} markAsRead={markAsRead} />
      )}

      {isModalOpen && selected && isUserNotification(selected) && (
        <UserModal selected={selected} closeModal={closeModal} />
      )}

      {isModalOpen && selected && isOrderNotification(selected) && (
        <OrderModal selected={selected} closeModal={closeModal} />
      )}
    </div>
  );
}

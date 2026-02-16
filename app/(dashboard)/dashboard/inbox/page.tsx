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
import { ContactMessage, Notification, User, Comment } from "@/types/notifType";
import OrderModal from "./modal/OrderModal";
import ContactModal from "./modal/ContactModal";
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

  const openModal = async (notif: Notification) => {
    setSelected(notif);
    setIsModalOpen(true);

    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications/read", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error("خطا در بروزرسانی وضعیت پیام");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
  };

  function isCommentNotification(
    notification: Notification,
  ): notification is Notification & {
    target: { kind: "Comment"; item: Comment };
  } {
    return notification.target.kind === "Comment";
  }

  function isUserNotification(
    notification: Notification,
  ): notification is Notification & { target: { kind: "User"; item: User } } {
    return notification.target.kind === "User";
  }

  function isOrderNotification(
    notification: Notification,
  ): notification is Notification & { target: { kind: "Order"; item: Order } } {
    return notification.target.kind === "Order";
  }

  function isContactNotification(
    notification: Notification,
  ): notification is Notification & {
    target: { kind: "ContactMessage"; item: ContactMessage };
  } {
    return notification.target.kind === "ContactMessage";
  }

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
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

  const typeMeta: Record<
    Notification["type"],
    { label: string; icon: ReactElement }
  > = {
    comment: { label: "کامنت", icon: <MessageCircle size={14} /> },
    order: { label: "سفارش", icon: <Package size={14} /> },
    user: { label: "کاربر", icon: <UserPlus size={14} /> },
    payment: { label: "پرداخت", icon: <Package size={14} /> },
    contact: { label: "تماس با ما", icon: <MessageCircle size={14} /> },
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
            <p className="mt-1 text-lg font-bold text-yellow-800">
              {unreadCount}
            </p>
          </div>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-xs text-green-700">خوانده‌شده</p>
            <p className="mt-1 text-lg font-bold text-green-800">
              {notifications.length - unreadCount}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در پیام‌ها..."
              className="w-full rounded-lg border border-gray-200 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`rounded-lg px-3 py-2 text-sm ${
                filterMode === "all"
                  ? "bg-gray-900 text-white"
                  : "border text-gray-700"
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setFilterMode("unread")}
              className={`rounded-lg px-3 py-2 text-sm ${
                filterMode === "unread"
                  ? "bg-gray-900 text-white"
                  : "border text-gray-700"
              }`}
            >
              خوانده‌نشده
            </button>
            <button
              onClick={() => setFilterMode("read")}
              className={`rounded-lg px-3 py-2 text-sm ${
                filterMode === "read"
                  ? "bg-gray-900 text-white"
                  : "border text-gray-700"
              }`}
            >
              خوانده‌شده
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border p-4">
                <Skeleton height={16} width={140} />
                <Skeleton height={12} className="mt-2" count={2} />
              </div>
            ))
          : filteredNotifications.map((notif) => {
              const meta = typeMeta[notif.type];

              return (
                <div
                  key={notif._id}
                  className={`rounded-xl border p-4 ${
                    notif.isRead ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border bg-white px-2 py-1 text-xs text-gray-700">
                          {meta.icon} {meta.label}
                        </span>
                        {!notif.isRead && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                            <Check size={14} /> جدید
                          </span>
                        )}
                      </div>

                      <p className="mt-2 truncate text-sm font-bold text-gray-900">
                        {notif.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                        {notif.message}
                      </p>

                      <p className="mt-2 text-xs text-gray-400">
                        {toPersianDate(notif.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => openModal(notif)}
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye size={14} /> مشاهده جزئیات
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

        {!loading && filteredNotifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
            پیامی مطابق فیلتر فعلی پیدا نشد.
          </div>
        )}
      </div>

      {isModalOpen && selected && isCommentNotification(selected) && (
        <CommentModal
          selected={selected}
          closeModal={closeModal}
          markAsRead={markAsRead}
        />
      )}

      {isModalOpen && selected && isUserNotification(selected) && (
        <UserModal selected={selected} closeModal={closeModal} />
      )}

      {isModalOpen && selected && isOrderNotification(selected) && (
        <OrderModal selected={selected} closeModal={closeModal} />
      )}

      {isModalOpen && selected && isContactNotification(selected) && (
        <ContactModal selected={selected} closeModal={closeModal} />
      )}
    </div>
  );
}

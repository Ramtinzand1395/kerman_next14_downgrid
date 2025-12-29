"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import CommentModal from "./modal/CommentModal";
import UserModal from "./modal/UserModal";
import { Notification, User, Comment } from "@/types/notifType";

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [OpenModal, setOpenModal] = useState(false);
  const [selected, setSelected] = useState<Notification | null>(null);

  const fetchNotif = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) throw new Error("خطا در دریافت پیام‌ها");

      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      toast.error("خطا در دریافت پیام‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotif();
  }, []);

  const openModal = (n: Notification) => {
    setOpenModal(true);
    setSelected(n);
  };

  const closeModal = () => setOpenModal(false);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications/read", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("خطا در علامت‌گذاری به عنوان خوانده شده");

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
      toast.error("خطا در علامت‌گذاری نوتیفیکیشن");
    }
  };
  
  function isCommentNotification(
    n: Notification
  ): n is Notification & { target: { kind: "Comment"; item: Comment } } {
    return n.target.kind === "Comment";
  }

  function isUserNotification(
    n: Notification
  ): n is Notification & { target: { kind: "User"; item: User } } {
    return n.target.kind === "User";
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 w-full max-w-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Bell size={18} /> پیام‌های مدیریت
        </h2>
      </div>

      <div className="space-y-2 overflow-y-auto">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg border flex justify-between items-center gap-4"
              >
                <div className="flex-1 space-y-2">
                  <Skeleton width={120} height={16} />
                  <Skeleton width={200} height={12} />
                  <Skeleton width={80} height={12} />
                </div>
                <Skeleton circle width={24} height={24} />
              </div>
            ))
          : notifications.map((n) => (
              <div
                key={n._id}
                className={`p-3 rounded-lg border flex justify-between ${
                  n.isRead ? "bg-gray-50" : "bg-yellow-50 border-yellow-400"
                }`}
              >
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  <button
                    onClick={() => openModal(n)}
                    className="text-xs text-blue-600"
                  >
                    مشاهده
                  </button>
                </div>

                {!n.isRead && (
                  <button
                    title="خوانده شده"
                    onClick={() => markAsRead(n._id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            ))}
      </div>

      {OpenModal && selected && isCommentNotification(selected) && (
        <CommentModal
          selected={selected}
          closeModal={closeModal}
          markAsRead={markAsRead}
        />
      )}
      {OpenModal && selected && isUserNotification(selected) && (
        <UserModal selected={selected} closeModal={closeModal} />
      )}
    </div>
  );
}

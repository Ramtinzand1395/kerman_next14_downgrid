"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type { NotificationItem, NotificationResponse } from "./types";
import { relativeTime } from "./relativeTime";

export default function NotificationBell({ admin = false }: { admin?: boolean }) {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    try {
      const response = await fetch("/api/notifications?limit=6", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as NotificationResponse;
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 45_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (status !== "authenticated") return null;
  const allHref = admin ? "/dashboard/notifications" : "/notifications";

  const readOne = async (item: NotificationItem) => {
    if (item.isRead) return;
    setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry));
    setUnreadCount((count) => Math.max(0, count - 1));
    await fetch(`/api/notifications/${item._id}/read`, { method: "PATCH" }).catch(() => undefined);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); if (!open) void load(); }}
        className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        aria-label={`اعلان‌ها؛ ${unreadCount.toLocaleString("fa-IR")} خوانده‌نشده`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -left-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? "+۹۹" : unreadCount.toLocaleString("fa-IR")}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-[70] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-right shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-bold text-slate-900">اعلان‌ها</p>
              <p className="text-xs text-slate-500">{unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده</p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!loading && items.length === 0 && (
              <div className="px-5 py-10 text-center text-sm text-slate-500">اعلان جدیدی ندارید.</div>
            )}
            {items.map((item) => (
              <Link
                key={item._id}
                href={item.link || allHref}
                onClick={() => { void readOne(item); setOpen(false); }}
                className={`block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50 ${item.isRead ? "bg-white" : "bg-indigo-50/60"}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.isRead ? "bg-slate-300" : "bg-indigo-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{item.message}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{relativeTime(item.createdAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Link href={allHref} onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 bg-slate-50 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
            <CheckCheck className="h-4 w-4" /> مشاهده همه اعلان‌ها
          </Link>
        </div>
      )}
    </div>
  );
}

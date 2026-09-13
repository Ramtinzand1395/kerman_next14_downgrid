"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import type { NotificationItem, NotificationResponse } from "./types";
import { relativeTime } from "./relativeTime";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";

const AdminNotificationAction = dynamic(
  () => import("./AdminNotificationAction"),
  { ssr: false },
);

type ReadFilter = "all" | "unread" | "read";

const priorityStyle: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-700",
};
const priorityLabel: Record<string, string> = { low: "کم", normal: "عادی", high: "مهم", urgent: "فوری" };

export default function NotificationCenter({ title = "مرکز اعلان‌ها", adminActions = false }: { title?: string; adminActions?: boolean }) {
  const { data: session } = useSession();
  const [data, setData] = useState<NotificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const read = filter === "all" ? "" : `&read=${filter === "read"}`;
      const response = await fetch(`/api/notifications?page=${page}&limit=12${read}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setData((await response.json()) as NotificationResponse);
    } catch {
      toast.error("دریافت اعلان‌ها با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { void load(); }, [load]);

  const markOne = async (item: NotificationItem): Promise<void> => {
    if (item.isRead) return;
    const response = await fetch(`/api/notifications/${item._id}/read`, { method: "PATCH" });
    if (!response.ok) {
      toast.error("ثبت وضعیت اعلان انجام نشد.");
      return;
    }
    setData((current) => current ? {
      ...current,
      unreadCount: Math.max(0, current.unreadCount - 1),
      notifications: current.notifications.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry),
    } : current);
  };

  const markAll = async () => {
    const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
    if (!response.ok) return toast.error("خواندن همه اعلان‌ها انجام نشد.");
    toast.success("همه اعلان‌ها خوانده شدند.");
    await load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("حذف اعلان انجام نشد.");
    setData((current) => current ? { ...current, notifications: current.notifications.filter((item) => item._id !== id) } : current);
    toast.success("اعلان حذف شد.");
  };

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-l from-indigo-950 to-indigo-700 p-5 text-white shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-white/15 p-3"><Bell className="h-6 w-6" /></span>
            <div><h1 className="text-2xl font-bold text-white">{title}</h1><p className="mt-1 text-sm text-indigo-100">پیگیری رویدادهای مهم حساب شما</p></div>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-2 text-sm">{(data?.unreadCount || 0).toLocaleString("fa-IR")} خوانده‌نشده</div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex gap-2">
          {([ ["all", "همه"], ["unread", "خوانده‌نشده"], ["read", "خوانده‌شده"] ] as const).map(([value, label]) => (
            <button key={value} onClick={() => { setFilter(value); setPage(1); }} className={`rounded-xl px-3 py-2 text-sm transition ${filter === value ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" aria-label="به‌روزرسانی"><RefreshCcw className="h-4 w-4" /></button>
          <button onClick={() => void markAll()} disabled={!data?.unreadCount} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="h-4 w-4" /> خواندن همه</button>
        </div>
      </div>

      <div className="space-y-3">
        {loading && <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>}
        {!loading && data?.notifications.map((item) => (
          <article key={item._id} className={`rounded-2xl border p-4 shadow-sm transition md:p-5 ${item.isRead ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50/50"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-slate-300" : "bg-indigo-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{item.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${priorityStyle[item.priority || "normal"]}`}>{priorityLabel[item.priority || "normal"]}</span>
                  {!item.isRead && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">جدید</span>}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-400" title={new Date(item.createdAt).toLocaleString("fa-IR")}>{relativeTime(item.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!item.isRead && <button onClick={() => void markOne(item)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50" aria-label="خوانده شد"><Check className="h-4 w-4" /></button>}
                <button onClick={() => void remove(item._id)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="حذف اعلان"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {adminActions && session?.user.role === "superadmin" && (
                <AdminNotificationAction item={item} onRead={() => markOne(item)} onChanged={load} />
              )}
              {item.link && <Link href={item.link} onClick={() => void markOne(item)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">رفتن به صفحه مرتبط <ChevronLeft className="h-4 w-4" /></Link>}
            </div>
          </article>
        ))}
        {!loading && !data?.notifications.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">اعلانی مطابق این فیلتر وجود ندارد.</div>}
      </div>

      {!!data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-xl border p-2 disabled:opacity-40" aria-label="صفحه قبل"><ChevronRight className="h-4 w-4" /></button>
          <span className="text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {data.pagination.pages.toLocaleString("fa-IR")}</span>
          <button disabled={page >= data.pagination.pages} onClick={() => setPage((value) => value + 1)} className="rounded-xl border p-2 disabled:opacity-40" aria-label="صفحه بعد"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      )}
    </section>
  );
}

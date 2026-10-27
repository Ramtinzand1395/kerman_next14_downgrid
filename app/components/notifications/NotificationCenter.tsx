"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, Bell, Check, CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, RefreshCcw, Search } from "lucide-react";
import { toast } from "react-toastify";
import type { NotificationItem, NotificationResponse } from "./types";
import { relativeTime } from "./relativeTime";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import {
  ButtonLoading,
  NotificationListSkeleton,
} from "@/app/components/loading/LoadingSystem";
import { announceNotificationUpdate } from "./events";

const AdminNotificationAction = dynamic(
  () => import("./AdminNotificationAction"),
  { ssr: false },
);

type ReadFilter = "all" | "unread" | "read";
type ItemOperation = "read" | "delete" | "handled";

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
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<ReadFilter>("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [handled, setHandled] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [markAllPending, setMarkAllPending] = useState(false);
  const [itemPending, setItemPending] = useState<Record<string, ItemOperation>>({});
  const latestRequest = useRef(0);
  const mounted = useRef(true);
  const markAllInFlight = useRef(false);
  const itemOperations = useRef(new Map<string, ItemOperation>());

  const load = useCallback(async () => {
    if (!mounted.current) return;
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (filter !== "all") params.set("read", String(filter === "read"));
      if (search.trim()) params.set("q", search.trim());
      if (category) params.set("category", category);
      if (priority) params.set("priority", priority);
      if (handled) params.set("handled", String(handled === "handled"));
      if (fromDate) params.set("from", new Date(`${fromDate}T00:00:00`).toISOString());
      if (toDate) params.set("to", new Date(`${toDate}T23:59:59.999`).toISOString());
      const response = await fetch(`/api/notifications?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const nextData = (await response.json()) as NotificationResponse;
      if (mounted.current && requestId === latestRequest.current) {
        if (page > nextData.pagination.pages) setPage(nextData.pagination.pages);
        else setData(nextData);
      }
    } catch {
      if (mounted.current && requestId === latestRequest.current)
        setError("اعلان‌ها دریافت نشدند؛ دوباره تلاش کنید.");
    } finally {
      if (mounted.current && requestId === latestRequest.current) setLoading(false);
    }
  }, [category, filter, fromDate, handled, page, priority, search, toDate]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      latestRequest.current += 1;
    };
  }, []);

  useEffect(() => { void load(); }, [load]);

  const invalidateActiveLoad = () => {
    latestRequest.current += 1;
    if (mounted.current) setLoading(false);
  };

  const beginItemOperation = (id: string, operation: ItemOperation) => {
    if (itemOperations.current.has(id)) return false;
    itemOperations.current.set(id, operation);
    setItemPending((current) => ({ ...current, [id]: operation }));
    invalidateActiveLoad();
    return true;
  };

  const finishItemOperation = (id: string) => {
    itemOperations.current.delete(id);
    if (!mounted.current) return;
    setItemPending((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const markOne = async (item: NotificationItem): Promise<void> => {
    if (item.isRead || !beginItemOperation(item._id, "read")) return;

    try {
      const response = await fetch(`/api/notifications/${item._id}/read`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("mark-read-failed");
      invalidateActiveLoad();
      if (!mounted.current) return;
      setData((current) => current ? {
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        notifications: current.notifications.map((entry) => entry._id === item._id ? { ...entry, isRead: true } : entry),
      } : current);
      announceNotificationUpdate();
      if (filter === "unread") await load();
    } catch {
      toast.error("وضعیت اعلان ذخیره نشد؛ دوباره تلاش کنید.");
    } finally {
      finishItemOperation(item._id);
    }
  };

  const markAll = async () => {
    if (markAllInFlight.current || !data?.unreadCount) return;
    markAllInFlight.current = true;
    setMarkAllPending(true);
    invalidateActiveLoad();

    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("mark-all-failed");
      invalidateActiveLoad();
      if (mounted.current) {
        setData((current) => current ? {
          ...current,
          unreadCount: 0,
          notifications: current.notifications.map((item) => ({
            ...item,
            isRead: true,
          })),
        } : current);
        toast.success("همه اعلان‌ها به‌عنوان خوانده‌شده ثبت شدند.");
        announceNotificationUpdate();
        if (filter === "unread") await load();
      }
    } catch {
      toast.error("وضعیت اعلان‌ها ذخیره نشد؛ دوباره تلاش کنید.");
    } finally {
      markAllInFlight.current = false;
      if (mounted.current) setMarkAllPending(false);
    }
  };

  const remove = async (item: NotificationItem) => {
    if (!beginItemOperation(item._id, "delete")) return;

    try {
      const response = await fetch(`/api/notifications/${item._id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("delete-failed");
      invalidateActiveLoad();
      if (!mounted.current) return;
      setData((current) => {
        if (!current) return current;
        const total = Math.max(0, current.pagination.total - 1);
        return {
          ...current,
          unreadCount: item.isRead
            ? current.unreadCount
            : Math.max(0, current.unreadCount - 1),
          notifications: current.notifications.filter(
            (entry) => entry._id !== item._id,
          ),
          pagination: {
            ...current.pagination,
            total,
            pages: Math.max(1, Math.ceil(total / current.pagination.limit)),
          },
        };
      });
      toast.success("اعلان از فهرست شما حذف شد.");
      announceNotificationUpdate();
      await load();
    } catch {
      toast.error("اعلان حذف نشد؛ دوباره تلاش کنید.");
    } finally {
      finishItemOperation(item._id);
    }
  };

  const toggleHandled = async (item: NotificationItem) => {
    if (!beginItemOperation(item._id, "handled")) return;
    try {
      const response = await fetch(`/api/admin/notifications/${item._id}/handled`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: item.handlingStatus !== "handled" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "handled-failed");
      toast.success(item.handlingStatus === "handled" ? "اعلان دوباره نیازمند رسیدگی شد." : "رسیدگی به اعلان ثبت شد.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error && error.message !== "handled-failed" ? error.message : "وضعیت رسیدگی ذخیره نشد.");
    } finally {
      finishItemOperation(item._id);
    }
  };

  return (
    <section className="space-y-5" aria-busy={loading}>
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
          <button onClick={() => void load()} disabled={loading} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50" aria-label="به‌روزرسانی"><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} /></button>
          <button onClick={() => void markAll()} disabled={markAllPending || !data?.unreadCount} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {markAllPending ? <ButtonLoading label="در حال ثبت…" /> : <><CheckCheck className="h-4 w-4" /> خواندن همه</>}
          </button>
        </div>
      </div>

      {adminActions && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-3 xl:grid-cols-6">
          <label className="relative md:col-span-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="جستجو در عنوان و متن" className="h-11 w-full rounded-xl border border-slate-200 pr-10 pl-3 text-sm" />
          </label>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">همه نوع‌ها</option><option value="order">سفارش</option><option value="payment">پرداخت</option><option value="support">پشتیبانی</option><option value="inventory">موجودی</option><option value="system">سایر</option>
          </select>
          <select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">همه اولویت‌ها</option><option value="urgent">فوری</option><option value="high">مهم</option><option value="normal">عادی</option><option value="low">کم</option>
          </select>
          <select value={handled} onChange={(event) => { setHandled(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
            <option value="">همه وضعیت‌های رسیدگی</option><option value="pending">نیازمند رسیدگی</option><option value="handled">رسیدگی‌شده</option>
          </select>
          <label className="text-xs text-slate-500">از تاریخ<input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2" /></label>
          <label className="text-xs text-slate-500">تا تاریخ<input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="mt-1 h-8 w-full rounded-lg border border-slate-200 px-2" /></label>
        </div>
      )}

      <div className="space-y-3">
        {loading && !data && <NotificationListSkeleton />}
        {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => void load()} className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-2 font-bold">تلاش دوباره</button></div>}
        {data?.notifications.map((item) => (
          <article key={item._id} className={`rounded-2xl border p-4 shadow-sm transition md:p-5 ${item.isRead ? "border-slate-200 bg-white" : "border-indigo-200 bg-indigo-50/50"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.isRead ? "bg-slate-300" : "bg-indigo-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-slate-900">{item.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${priorityStyle[item.priority || "normal"]}`}>{priorityLabel[item.priority || "normal"]}</span>
                  {!item.isRead && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">جدید</span>}
                  {adminActions && <span className={`rounded-full px-2 py-0.5 text-xs ${item.handlingStatus === "handled" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{item.handlingStatus === "handled" ? "رسیدگی‌شده" : "نیازمند رسیدگی"}</span>}
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-400" title={new Date(item.createdAt).toLocaleString("fa-IR")}>{relativeTime(item.createdAt)}</p>
                {adminActions && item.handlingStatus === "handled" && item.handledAt ? <p className="mt-1 text-xs text-emerald-700">رسیدگی توسط {typeof item.handledBy === "object" && item.handledBy?.username ? item.handledBy.username : "مدیر"} در {new Date(item.handledAt).toLocaleString("fa-IR")}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!item.isRead && <button disabled={Boolean(itemPending[item._id])} onClick={() => void markOne(item)} className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50" aria-label={itemPending[item._id] === "read" ? "در حال ثبت وضعیت اعلان" : "خوانده شد"}>{itemPending[item._id] === "read" ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Check className="h-4 w-4" />}</button>}
                <button disabled={Boolean(itemPending[item._id])} onClick={() => void remove(item)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50" aria-label={itemPending[item._id] === "delete" ? "در حال بایگانی اعلان" : "بایگانی اعلان"}>{itemPending[item._id] === "delete" ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Archive className="h-4 w-4" />}</button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {adminActions && session?.user.role === "superadmin" && (
                <><AdminNotificationAction item={item} onRead={() => markOne(item)} onChanged={load} /><button type="button" onClick={() => void toggleHandled(item)} disabled={Boolean(itemPending[item._id])} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"><CheckCheck className="h-4 w-4" />{item.handlingStatus === "handled" ? "بازگردانی به صف" : "ثبت رسیدگی"}</button></>
              )}
              {item.link && <Link href={item.link} onClick={() => void markOne(item)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">رفتن به صفحه مرتبط <ChevronLeft className="h-4 w-4" /></Link>}
            </div>
          </article>
        ))}
        {!loading && !error && !data?.notifications.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">اعلانی مطابق این فیلتر وجود ندارد.</div>}
      </div>

      {!!data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-xl border p-2 disabled:opacity-40" aria-label="صفحه قبل"><ChevronRight className="h-4 w-4" /></button>
          <span className="text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {data.pagination.pages.toLocaleString("fa-IR")}</span>
          <button disabled={page >= data.pagination.pages || loading} onClick={() => setPage((value) => value + 1)} className="rounded-xl border p-2 disabled:opacity-40" aria-label="صفحه بعد"><ChevronLeft className="h-4 w-4" /></button>
        </div>
      )}
    </section>
  );
}

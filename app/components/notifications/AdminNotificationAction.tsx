"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  Loader2,
  Mail,
  PackageCheck,
  Phone,
  Save,
  Star,
  UserRound,
  X,
} from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import { toast } from "react-toastify";
import type { NotificationItem } from "./types";

type DetailRecord = Record<string, unknown>;
type RequestStatus = "pending" | "confirmed" | "rejected" | "completed";

const manageableKinds = new Set([
  "Comment",
  "Order",
  "User",
  "ContactMessage",
  "CustomerGameOrder",
]);

const orderStatusLabel: Record<string, string> = {
  pending: "در انتظار پردازش",
  processing: "در حال پردازش",
  shipped: "ارسال شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
};

const requestStatusLabel: Record<RequestStatus, string> = {
  pending: "در انتظار بررسی",
  confirmed: "تایید شده",
  rejected: "رد شده",
  completed: "تکمیل شده",
};

function record(value: unknown): DetailRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DetailRecord)
    : {};
}

function text(value: unknown, fallback = "---") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function id(value: unknown) {
  if (typeof value === "string") return value;
  const object = record(value);
  return typeof object._id === "string" ? object._id : "";
}

function date(value: unknown) {
  if (typeof value !== "string" && !(value instanceof Date)) return "---";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "---" : parsed.toLocaleString("fa-IR");
}

function DetailBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function DetailsModal({
  notification,
  onClose,
  onChanged,
}: {
  notification: NotificationItem;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const kind = notification.entityType || notification.target?.kind;
  const item = record(notification.target?.item);
  const entityId = id(item._id || notification.entityId);
  const [working, setWorking] = useState<string | null>(null);
  const [approved, setApproved] = useState(Boolean(item.verified));
  const [orderStatus, setOrderStatus] = useState(text(item.status, "pending"));
  const [requestStatus, setRequestStatus] = useState<RequestStatus>(
    (text(item.status, "pending") as RequestStatus),
  );
  const [totalPrice, setTotalPrice] = useState(String(number(item.totalPrice)));

  const run = async (key: string, action: () => Promise<void>) => {
    setWorking(key);
    try {
      await action();
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setWorking(null);
    }
  };

  const approveComment = () => run("approve", async () => {
    const response = await fetch("/api/admin/notifications/approve", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: entityId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "تایید دیدگاه انجام نشد.");
    setApproved(true);
    toast.success("دیدگاه تایید شد.");
  });

  const startOrderProcessing = () => run("processing", async () => {
    const response = await fetch("/api/admin/order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "processing", orderId: entityId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "تغییر وضعیت سفارش انجام نشد.");
    setOrderStatus("processing");
    toast.success("پردازش سفارش آغاز شد.");
  });

  const updateRequestStatus = (nextStatus: RequestStatus) => run("status", async () => {
    const response = await fetch(`/api/admin/customer-game-orders/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "تغییر وضعیت درخواست انجام نشد.");
    setRequestStatus(nextStatus);
    toast.success("وضعیت درخواست تغییر کرد.");
  });

  const updateRequestPrice = () => run("price", async () => {
    const parsedPrice = Number(totalPrice.replace(/,/g, "").trim());
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      throw new Error("مبلغ باید عددی معتبر و غیرمنفی باشد.");
    }
    const response = await fetch(`/api/admin/customer-game-orders/${entityId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalPrice: parsedPrice }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "ذخیره مبلغ انجام نشد.");
    setTotalPrice(String(parsedPrice));
    toast.success("مبلغ سفارش ذخیره شد.");
  });

  const user = record(item.user);
  const product = record(item.product);
  const address = record(item.addressSnapshot);
  const items = Array.isArray(item.items) ? item.items.map(record) : [];
  const products = Array.isArray(item.products) ? item.products.map(record) : [];

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" aria-label="بستن" onClick={onClose} className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" className="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div><p className="text-xs font-semibold text-indigo-600">مدیریت اعلان</p><h2 className="mt-1 text-lg font-bold text-slate-900">{notification.title}</h2></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="بستن"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-5 p-5">
          {kind === "Comment" && (
            <>
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4">
                <ProductImage src={typeof product.mainImage === "string" ? product.mainImage : null} alt={text(product.title, "محصول")} width={72} height={72} sizes="72px" className="h-[72px] w-[72px] rounded-xl object-cover" />
                <div><h3 className="font-bold text-slate-900">{text(product.title, "محصول نامشخص")}</h3><p className="mt-1 text-xs text-slate-500">SKU: {text(product.sku)}</p></div>
              </div>
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">{text(item.text)}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <DetailBox label="کاربر" value={<span className="inline-flex items-center gap-1"><UserRound className="h-4 w-4" />{text(user.username)}</span>} />
                <DetailBox label="موبایل" value={text(user.mobile)} />
                <DetailBox label="امتیاز" value={<span className="inline-flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{number(item.rating).toLocaleString("fa-IR")}</span>} />
              </div>
              {!approved && <button type="button" onClick={() => void approveComment()} disabled={working === "approve"} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{working === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} تایید دیدگاه</button>}
              {approved && <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> دیدگاه تایید شده است</span>}
            </>
          )}

          {kind === "Order" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailBox label="مشتری" value={text(user.username, "نامشخص")} />
                <DetailBox label="موبایل" value={text(user.mobile)} />
                <DetailBox label="پرداخت" value={item.paymentStatus === "paid" ? "پرداخت شده" : "در انتظار پرداخت"} />
                <DetailBox label="وضعیت" value={orderStatusLabel[orderStatus] || orderStatus} />
              </div>
              <DetailBox label="مبلغ کل" value={`${number(item.finalPrice).toLocaleString("fa-IR")} تومان`} />
              {!!items.length && <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[560px] text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">محصول</th><th className="p-3">قیمت</th><th className="p-3">تعداد</th><th className="p-3">جمع</th></tr></thead><tbody>{items.map((entry, index) => { const entryProduct = record(entry.product); return <tr key={id(entry._id) || index} className="border-t"><td className="p-3 font-semibold">{text(entryProduct.title)}</td><td className="p-3">{number(entry.price).toLocaleString("fa-IR")}</td><td className="p-3">{number(entry.quantity).toLocaleString("fa-IR")}</td><td className="p-3">{number(entry.total).toLocaleString("fa-IR")}</td></tr>; })}</tbody></table></div>}
              {orderStatus === "pending" && <button type="button" onClick={() => void startOrderProcessing()} disabled={working === "processing"} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{working === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />} شروع پردازش سفارش</button>}
            </>
          )}

          {kind === "User" && <div className="grid gap-3 sm:grid-cols-2"><DetailBox label="نام کاربری" value={text(item.username, "کاربر")} /><DetailBox label="شماره موبایل" value={text(item.mobile)} /><DetailBox label="تاریخ ثبت‌نام" value={date(item.createdAt)} /></div>}

          {kind === "ContactMessage" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2"><DetailBox label="نام" value={text(item.name)} /><DetailBox label="تلفن" value={<span className="inline-flex items-center gap-1"><Phone className="h-4 w-4" />{text(item.phone)}</span>} /><DetailBox label="ایمیل" value={<span className="inline-flex items-center gap-1"><Mail className="h-4 w-4" />{text(item.email)}</span>} /><DetailBox label="زمان ارسال" value={date(item.createdAt)} /></div>
              <DetailBox label="موضوع" value={text(item.subject)} />
              <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-500">متن پیام</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{text(item.message)}</p></div>
            </>
          )}

          {kind === "CustomerGameOrder" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2"><DetailBox label="مشتری" value={text(user.username, text(item.customerName))} /><DetailBox label="موبایل" value={text(user.mobile, text(item.phone))} /><DetailBox label="تاریخ ثبت" value={date(item.createdAt)} /><DetailBox label="آدرس" value={[text(address.province, ""), text(address.city, ""), text(address.address, text(item.address, ""))].filter(Boolean).join("، ") || "---"} /></div>
              {typeof item.message === "string" && item.message && <DetailBox label="پیام مشتری" value={item.message} />}
              <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 md:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">وضعیت درخواست<select value={requestStatus} onChange={(event) => void updateRequestStatus(event.target.value as RequestStatus)} disabled={working === "status"} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-indigo-400">{Object.entries(requestStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="text-sm font-semibold text-slate-700">مبلغ کل<div className="mt-2 flex gap-2"><input type="number" min="0" value={totalPrice} onChange={(event) => setTotalPrice(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-indigo-400" /><button type="button" onClick={() => void updateRequestPrice()} disabled={working === "price"} className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 text-white disabled:opacity-50">{working === "price" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} ذخیره</button></div></label>
              </div>
              {!!products.length && <div className="space-y-2"><h3 className="font-bold text-slate-900">محصولات درخواست</h3>{products.map((entry, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-4"><span className="font-semibold">{text(entry.name)}</span><span>{text(entry.platform, "بدون پلتفرم")}</span><span>{number(entry.size) ? `${number(entry.size).toLocaleString("fa-IR")} GB` : "حجم نامشخص"}</span><span>{number(entry.price).toLocaleString("fa-IR")} تومان</span></div>)}</div>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminNotificationAction({
  item,
  onRead,
  onChanged,
}: {
  item: NotificationItem;
  onRead: () => Promise<void> | void;
  onChanged: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const kind = item.entityType || item.target?.kind;

  if (!kind || !manageableKinds.has(kind)) return null;

  const open = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/notifications/${item._id}/details`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "جزئیات دریافت نشد.");
      setSelected(result.notification as NotificationItem);
      await onRead();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "جزئیات دریافت نشد.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setSelected(null);
    void onChanged();
  };

  return (
    <>
      <button type="button" onClick={() => void open()} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} مشاهده و مدیریت
      </button>
      {selected && <DetailsModal notification={selected} onClose={close} onChanged={onChanged} />}
    </>
  );
}

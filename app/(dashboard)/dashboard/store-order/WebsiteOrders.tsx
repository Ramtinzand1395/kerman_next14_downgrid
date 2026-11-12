"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { AppointmentItem, AppointmentListResponse } from "@/types/appointments";
import { gameKey } from "@/lib/appointments/games";
import AppointmentGamesEditor from "../appointments/_components/AppointmentGamesEditor";
import { courierLabel, formatTehranDate, statusLabel, toman } from "../appointments/_components/appointment-ui";
import { sendAppointmentPaymentLink } from "../appointments/_components/send-payment-link";

const storeOrderPath = "/dashboard/store-order";
const primaryButton = "rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
const secondaryButton = "rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-800";

export default function WebsiteOrders() {
  const id = useSearchParams().get("appointment");
  return id ? <WebsiteOrder key={id} id={id} /> : <WebsiteOrderList />;
}

function WebsiteOrderList() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AppointmentListResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setLoading(true);
    setError("");
    fetch(`/api/admin/appointments?storeOrders=1&page=${page}&limit=8`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "سفارش‌های سایت دریافت نشد.");
        setResult(payload.data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("سفارش‌های سایت دریافت نشد؛ صفحه را تازه کنید.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page]);

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-5">
      <h2 className="text-lg font-black text-slate-900">سفارش‌های پیک سایت</h2>
      {loading ? <p className="text-sm">در حال دریافت سفارش‌ها…</p> : error ? (
        <p role="alert" className="text-sm text-rose-700">{error}</p>
      ) : result?.items.length ? (
        <>
          <ul className="grid gap-2 md:grid-cols-2">
            {result.items.map((item) => (
              <li key={item._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div>
                  <WebsiteBadge /> <span className="font-bold">{item.customerName} · {item.device}</span>
                  <p className="mt-1 text-xs text-slate-600">{item.trackingCode} · {item.storeOrderRegisteredAt || item.status !== "confirmed" ? statusLabel[item.status] : "در انتظار ثبت دستی"} · {toman(item.pricing?.finalAmount)}</p>
                </div>
                <Link href={`${storeOrderPath}?appointment=${item._id}`} className={secondaryButton}>باز کردن سفارش</Link>
              </li>
            ))}
          </ul>
          {result.pages > 1 && (
            <div className="flex items-center gap-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">قبلی</button>
              <span>{page.toLocaleString("fa-IR")} / {result.pages.toLocaleString("fa-IR")}</span>
              <button type="button" disabled={page >= result.pages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">بعدی</button>
            </div>
          )}
        </>
      ) : <p className="text-sm text-slate-600">سفارش پیکی برای ثبت یا پیگیری وجود ندارد.</p>}
    </section>
  );
}

function WebsiteBadge() {
  return <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-800">سایت</span>;
}

function WebsiteOrder({ id }: { id: string }) {
  const [item, setItem] = useState<AppointmentItem>();
  const [amount, setAmount] = useState("");
  const [editingGames, setEditingGames] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/admin/appointments/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "سفارش دریافت نشد.");
        const order: AppointmentItem = payload.data;
        if (order.fulfillment !== "courier") throw new Error("درخواست پیک پیدا نشد.");
        setItem(order);
        setAmount(String(order.pricing?.serviceBaseAmount ?? order.pricing?.baseAmount ?? ""));
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) {
          setItem(undefined);
          setError(reason.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, revision]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!item || saving || !amount.trim()) return;
    const complete = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "complete";
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(`/api/admin/appointments/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(complete ? { status: "completed" } : { registerStoreOrder: true }),
          baseAmount: Number(amount),
          expectedUpdatedAt: item.updatedAt,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409) setRevision((value) => value + 1);
        throw new Error(payload.error || "سفارش ذخیره نشد.");
      }
      const updated: AppointmentItem = payload.data;
      setItem(updated);
      if (complete && Number(updated.pricing?.finalAmount) > 0) {
        try {
          setNotice(await sendAppointmentPaymentLink(item._id));
        } catch (reason) {
          setNotice(`خدمت تکمیل شد. ارسال لینک پرداخت ناموفق بود. ${reason instanceof Error ? reason.message : ""}`);
        }
      } else {
        setNotice(complete ? "خدمت تکمیل شد و سفارش آماده برگشت با پیک است." : "سفارش و مبلغ خدمت ذخیره شد.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "سفارش ذخیره نشد.");
    } finally {
      setSaving(false);
    }
  };

  const canEdit = item?.status === "confirmed" && item.courier?.status === "at_store" &&
    !["initiating", "pending", "paid"].includes(item.payment?.status || "");

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">ثبت سفارش دستی <WebsiteBadge /></h2>
        <Link href={storeOrderPath} className={secondaryButton}>فهرست سفارش‌ها</Link>
      </div>
      {loading && <p className="text-sm">در حال دریافت سفارش…</p>}
      {error && <p role="alert" className="text-sm font-bold text-rose-700">{error}</p>}
      {notice && <p role="status" className="break-words text-sm font-bold text-indigo-800">{notice}</p>}
      {item && !loading && (
        <>
          <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt>مشتری</dt><dd className="font-bold">{item.customerName} · <bdi>{item.phone}</bdi></dd></div>
            <div><dt>دستگاه و نوع خدمت</dt><dd className="font-bold">{item.device} · {item.serviceType === "repair" ? "تعمیرات" : item.installationType === "copy" ? "نصب کپی‌خور" : "نصب بازی"}</dd></div>
            <div><dt>کد پیگیری</dt><dd className="font-bold">{item.trackingCode}</dd></div>
            <div><dt>وضعیت پیک</dt><dd className="font-bold">{item.courier ? courierLabel[item.courier.status] : "نامشخص"}</dd></div>
            <div><dt>هزینه نهایی پیک</dt><dd className="font-bold">{toman(item.pricing?.shippingFinalAmount ?? item.courier?.finalShippingCost)}</dd></div>
            <div><dt>تخفیف کل</dt><dd className="font-bold">{toman(item.pricing?.totalDiscountAmount)}</dd></div>
            <div><dt>مبلغ قابل پرداخت</dt><dd className="font-bold">{toman(item.pricing?.finalAmount)}</dd></div>
            <div><dt>وضعیت خدمت</dt><dd className="font-bold">{statusLabel[item.status]}</dd></div>
            {item.courier?.addressSnapshot?.address && (
              <div className="sm:col-span-2"><dt>آدرس پیک</dt><dd className="font-bold">{item.courier.addressSnapshot.city}، {item.courier.addressSnapshot.address}</dd></div>
            )}
            {item.courier?.pickupWindow && (
              <div className="sm:col-span-2"><dt>بازه دریافت پیک</dt><dd className="font-bold">{formatTehranDate(item.startsAt)} · <bdi>{item.courier.pickupWindow.start}–{item.courier.pickupWindow.end}</bdi></dd></div>
            )}
          </dl>
          {item.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{item.description}</p>}
          {item.serviceType === "game_install" && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">بازی‌ها · {(item.totalSizeGB ?? 0).toLocaleString("fa-IR")} گیگابایت</h3>
              <ul className="flex flex-wrap gap-2">
                {item.selectedGames?.map((game) => (
                  <li key={gameKey(game)} className="rounded-lg bg-slate-100 px-2 py-1 text-sm">{game.name} · {game.version}</li>
                ))}
              </ul>
              {canEdit && <button type="button" disabled={saving} onClick={() => setEditingGames(true)} className={secondaryButton}>ویرایش بازی‌ها</button>}
            </div>
          )}
          {canEdit && (
            <form onSubmit={submit} className="space-y-3">
              <label className="block text-sm font-bold">
                مبلغ خدمت (تومان)
                <input required type="number" min={0} max={1_000_000_000} step={1} value={amount}
                  onChange={(event) => setAmount(event.target.value)} className="mt-1 block w-full max-w-xs rounded-lg border p-2" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" value="register" disabled={saving} className={primaryButton}>{item.storeOrderRegisteredAt ? "ذخیره مبلغ خدمت" : "ثبت سفارش"}</button>
                {item.storeOrderRegisteredAt && <button type="submit" value="complete" disabled={saving} className={primaryButton}>تکمیل خدمت و ارسال لینک پرداخت</button>}
              </div>
            </form>
          )}
          <Link href={`/dashboard/appointments?tab=courier&appointment=${item._id}`} className={`inline-block ${secondaryButton}`}>
            ادامه عملیات پیک
          </Link>
          {editingGames && (
            <AppointmentGamesEditor item={item} onClose={() => setEditingGames(false)}
              onSaved={(message) => {
                setEditingGames(false);
                setNotice(message);
                setRevision((value) => value + 1);
              }} />
          )}
        </>
      )}
    </section>
  );
}

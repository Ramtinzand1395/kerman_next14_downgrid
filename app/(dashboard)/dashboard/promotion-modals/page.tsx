"use client";

import Link from "@/app/components/navigation/NavigationFeedback";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { apiFetch } from "@/lib/loyalty/ui";
import PromotionDialog from "@/app/(public)/components/PromotionDialog";
import type { PromotionOffer } from "@/lib/promotions/policy";

type CouponOption = {
  _id: string; code: string; title?: string; type: "percent" | "fixed"; value: number;
  minPurchaseAmount?: number; maxDiscountAmount?: number; products?: string[];
  categories?: string[]; expiresAt?: string; isActive?: boolean;
};
type Form = {
  name: string; title: string; body: string; ctaLabel: string; ctaHref: string;
  dismissLabel: string; coupon: string; isActive: boolean; priority: number;
};
type Item = Omit<Form, "coupon"> & { _id: string; coupon: CouponOption | null };
const empty: Form = {
  name: "", title: "یه تغییر کوچیک برای اتاقت", body: "",
  ctaLabel: "تابلوها رو ببین", ctaHref: "/category/gaming-wall-art",
  dismissLabel: "فعلاً نه", coupon: "", isActive: false, priority: 0,
};
const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

function formOf(item: Item): Form {
  return { name: item.name, title: item.title, body: item.body, ctaLabel: item.ctaLabel,
    ctaHref: item.ctaHref, dismissLabel: item.dismissLabel, coupon: item.coupon?._id ?? "",
    isActive: item.isActive, priority: item.priority };
}

export default function PromotionModalsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [coupons, setCoupons] = useState<CouponOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PromotionOffer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiFetch<{ items: Item[]; coupons: CouponOption[] }>("/api/admin/promotion-modals");
    if (result.ok && result.data) {
      setItems(result.data.items); setCoupons(result.data.coupons); setLoadError("");
    } else setLoadError(result.error || "پیام‌ها دریافت نشدند. دوباره تلاش کن.");
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  function reset() { setEditing(null); setForm({ ...empty }); }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const result = await apiFetch(`/api/admin/promotion-modals${editing ? `/${editing._id}` : ""}`, {
      method: editing ? "PATCH" : "POST", body: JSON.stringify(form),
    });
    if (result.ok) { toast.success("پیام ذخیره شد."); reset(); await load(); }
    else toast.error(result.error || "ذخیره نشد. دوباره تلاش کن.");
    setSaving(false);
  }
  async function toggle(item: Item) {
    if (busyId) return;
    setBusyId(item._id);
    const result = await apiFetch(`/api/admin/promotion-modals/${item._id}`, {
      method: "PATCH", body: JSON.stringify({ ...formOf(item), isActive: !item.isActive }),
    });
    if (result.ok) { await load(); if (editing?._id === item._id) reset(); }
    else toast.error(result.error || "وضعیت تغییر نکرد.");
    setBusyId(null);
  }
  async function remove(item: Item) {
    if (busyId) return;
    setBusyId(item._id);
    const result = await apiFetch(`/api/admin/promotion-modals/${item._id}`, { method: "DELETE" });
    if (result.ok) { if (editing?._id === item._id) reset(); setDeleteId(null); await load(); }
    else toast.error(result.error || "پیام حذف نشد.");
    setBusyId(null);
  }
  const selectedCoupon = coupons.find((coupon) => coupon._id === form.coupon)
    ?? (editing?.coupon?._id === form.coupon ? editing.coupon : null);

  function showPreview() {
    if (!selectedCoupon || !form.title.trim() || !form.body.trim()) {
      toast.info("عنوان، متن و کد تخفیف را کامل کن."); return;
    }
    if (!/^\/(?!\/)/.test(form.ctaHref) || /[\\\u0000-\u0020]/.test(form.ctaHref)) {
      toast.error("آدرس دکمه باید یک مسیر داخلی سایت باشد."); return;
    }
    const conditions = ["کد رو کپی کن و موقع پرداخت، تخفیفت رو بگیر."];
    if (selectedCoupon.minPurchaseAmount) conditions.push(`حداقل خرید: ${selectedCoupon.minPurchaseAmount.toLocaleString("fa-IR")} تومان.`);
    if (selectedCoupon.maxDiscountAmount) conditions.push(`سقف تخفیف: ${selectedCoupon.maxDiscountAmount.toLocaleString("fa-IR")} تومان.`);
    setPreview({ id: "preview", title: form.title, body: form.body, code: selectedCoupon.code,
      ctaLabel: form.ctaLabel, ctaHref: form.ctaHref, dismissLabel: form.dismissLabel,
      discountLabel: selectedCoupon.type === "percent" ? `${selectedCoupon.value.toLocaleString("fa-IR")}٪ تخفیف` : `${selectedCoupon.value.toLocaleString("fa-IR")} تومان تخفیف`,
      conditions, expiresAt: null });
  }

  return (
    <div className="space-y-6 p-4 text-slate-900 md:p-6" dir="rtl">
      <header className="rounded-3xl bg-slate-950 p-6 text-white">
        <h1 className="text-2xl font-black">پیام‌های پیشنهادی سایت</h1>
        <p className="mt-2 text-sm leading-7 text-slate-200">متن پیشنهاد را بنویس و به یکی از کدهای باشگاه مشتریان وصل کن. پیام برای کسی که کد را مصرف کرده نمایش داده نمی‌شود.</p>
        <Link href="/dashboard/loyalty" className="mt-3 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm underline">مدیریت کدها در باشگاه مشتریان</Link>
      </header>
      {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{loadError}<button onClick={() => { void load(); }} className="mr-3 underline">تلاش دوباره</button></div>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">{editing ? "ویرایش پیام" : "پیام جدید"}</h2>
          <label className="block space-y-1 text-sm">نام داخلی<input required maxLength={80} className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><span className="text-xs text-slate-500">فقط در پنل نمایش داده می‌شود.</span></label>
          <label className="block space-y-1 text-sm">عنوان پیام<input required maxLength={100} className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label className="block space-y-1 text-sm">متن پیام<textarea required maxLength={800} rows={5} className={input} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <label className="block space-y-1 text-sm">کد باشگاه مشتریان<select required className={input} value={form.coupon} onChange={(e) => setForm({ ...form, coupon: e.target.value })}>
            <option value="">انتخاب کد تخفیف</option>
            {editing?.coupon && !coupons.some((c) => c._id === editing.coupon?._id) && <option value={editing.coupon._id}>{editing.coupon.code} — کد فعلی</option>}
            {coupons.map((coupon) => <option key={coupon._id} value={coupon._id}>{coupon.code}{coupon.title ? ` — ${coupon.title}` : ""}</option>)}
          </select><span className="text-xs leading-6 text-slate-500">فقط کدهایی که سقف استفاده هر کاربرشان ۱ است قابل انتخاب‌اند. مبلغ، شرایط و اعتبار از خود کد خوانده می‌شود.</span></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">متن دکمه<input required maxLength={50} className={input} value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} /></label>
            <label className="block space-y-1 text-sm">متن بستن<input required maxLength={40} className={input} value={form.dismissLabel} onChange={(e) => setForm({ ...form, dismissLabel: e.target.value })} /></label>
          </div>
          <label className="block space-y-1 text-sm">صفحه مقصد دکمه<input required maxLength={300} dir="ltr" className={input} value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} /></label>
          <label className="block space-y-1 text-sm">اولویت نمایش<input type="number" min={0} max={100} required className={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /><span className="text-xs text-slate-500">اگر چند پیشنهاد معتبر باشد، عدد بزرگ‌تر زودتر نمایش داده می‌شود.</span></label>
          <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />نمایش در سایت فعال باشد</label>
          <div className="flex flex-wrap gap-3">
            <button disabled={saving || loading || !!loadError} className="min-h-11 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیره پیام"}</button>
            <button type="button" onClick={showPreview} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm">پیش‌نمایش</button>
            {editing && <button type="button" onClick={reset} className="min-h-11 px-3 text-sm">انصراف از ویرایش</button>}
          </div>
        </form>
        <section className="space-y-3" aria-label="فهرست پیام‌ها">
          <h2 className="text-lg font-bold">پیام‌های ساخته‌شده</h2>
          <p className="text-xs leading-6 text-slate-600">هر پیام در هر بار ورود به سایت یک بار باز می‌شود؛ با تغییر صفحه دوباره باز نمی‌شود. روی ورود و پرداخت نمایش داده نمی‌شود. غیرفعال‌کردن پیام، خود کد تخفیف را غیرفعال نمی‌کند.</p>
          {loading ? <p role="status" className="p-4 text-sm">در حال دریافت پیام‌ها…</p> : !items.length && !loadError ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500">هنوز پیامی ساخته نشده.</p> : null}
          {items.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.name}</h3><span className={`rounded-full px-3 py-1 text-xs ${item.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "نمایش روشن" : "نمایش خاموش"}</span></div>
            <p className="mt-3 text-sm font-semibold">{item.title}</p><p className="mt-1 whitespace-pre-line text-sm leading-7 text-slate-600">{item.body}</p>
            <p className="mt-3 text-xs text-slate-500">کد: <span dir="ltr">{item.coupon?.code ?? "کد حذف شده"}</span> · اولویت: {item.priority.toLocaleString("fa-IR")}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <button disabled={!!busyId} onClick={() => { setEditing(item); setForm(formOf(item)); }} className="min-h-11 rounded-lg border px-3">ویرایش</button>
              <button disabled={!!busyId || !item.coupon} onClick={() => { void toggle(item); }} className="min-h-11 rounded-lg border px-3">{item.isActive ? "غیرفعال کن" : "فعال کن"}</button>
              {deleteId === item._id ? <><button disabled={!!busyId} onClick={() => { void remove(item); }} className="min-h-11 rounded-lg bg-red-50 px-3 text-red-700">حذف این پیام</button><button onClick={() => setDeleteId(null)} className="min-h-11 px-3">انصراف</button></> : <button disabled={!!busyId} onClick={() => setDeleteId(item._id)} className="min-h-11 px-3 text-red-700">حذف</button>}
            </div>
          </article>)}
        </section>
      </div>
      {preview && <PromotionDialog offer={preview} preview onClose={() => setPreview(null)} />}
    </div>
  );
}

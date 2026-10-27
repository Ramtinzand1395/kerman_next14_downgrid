"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Loader2, Save, Search, Send, X } from "lucide-react";
import { toast } from "react-toastify";

type UserOption = { _id: string; username?: string; mobile: string; email?: string };
type NamedOption = { _id: string; title?: string; name?: string; slug?: string };
type AudienceKind = "selected" | "all_users" | "product_buyers" | "category_buyers" | "active_orders";

const templates = [
  { label: "پیگیری سفارش", title: "به‌روزرسانی سفارش شما", message: "وضعیت سفارش شما به‌روزرسانی شده است. برای مشاهده جزئیات وارد حساب کاربری شوید.", link: "/my-profile?step=5" },
  { label: "موجودی دوباره", title: "محصول موردنظر دوباره موجود شد", message: "محصول موردنظر شما دوباره موجود شده است. برای بررسی موجودی و ثبت سفارش وارد فروشگاه شوید.", link: "/products" },
  { label: "اطلاع‌رسانی فروشگاه", title: "اطلاع‌رسانی کرمان آتاری", message: "", link: "/" },
];

export default function CampaignComposer() {
  const [kind, setKind] = useState<AudienceKind>("selected");
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [options, setOptions] = useState<NamedOption[]>([]);
  const [optionId, setOptionId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [priority, setPriority] = useState("normal");
  const [scheduledAt, setScheduledAt] = useState("");
  const [preview, setPreview] = useState<{ count: number; sample: UserOption[] } | null>(null);
  const [working, setWorking] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const audience = useMemo(() => {
    if (kind === "selected") return { kind, userIds: selectedUsers.map((user) => user._id) };
    if (kind === "product_buyers") return { kind, productId: optionId };
    if (kind === "category_buyers") return { kind, categoryId: optionId };
    return { kind };
  }, [kind, optionId, selectedUsers]);

  useEffect(() => {
    if (kind !== "selected" || userQuery.trim().length < 2) { setUsers([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/notifications/recipients?q=${encodeURIComponent(userQuery.trim())}`, { signal: controller.signal });
        const result = await response.json();
        if (response.ok) setUsers(result.users || []);
      } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setUsers([]); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [kind, userQuery]);

  useEffect(() => {
    if (!["product_buyers", "category_buyers"].includes(kind)) { setOptions([]); setOptionId(""); return; }
    const optionKind = kind === "product_buyers" ? "products" : "categories";
    fetch(`/api/admin/notification-campaigns/audience-options?kind=${optionKind}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((result) => setOptions(result.items || []))
      .catch(() => toast.error("فهرست گروه مخاطبان دریافت نشد."));
  }, [kind]);

  const isAudienceReady = kind === "selected"
    ? selectedUsers.length > 0
    : ["product_buyers", "category_buyers"].includes(kind) ? Boolean(optionId) : true;

  const previewAudience = async () => {
    if (!isAudienceReady) return toast.error("ابتدا مخاطبان را کامل انتخاب کنید.");
    setWorking("preview");
    try {
      const response = await fetch("/api/admin/notification-campaigns/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(audience) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "پیش‌نمایش دریافت نشد.");
      setPreview(result);
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "پیش‌نمایش دریافت نشد."); }
    finally { setWorking(""); }
  };

  const submit = async (mode: "draft" | "send") => {
    if (!isAudienceReady || !title.trim() || !message.trim()) return toast.error("عنوان، متن و مخاطبان را کامل کنید.");
    setWorking(mode);
    try {
      const response = await fetch("/api/admin/notification-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          title,
          message,
          link,
          priority,
          audience,
          mode,
          ...(mode === "send" && scheduledAt ? { scheduledAt: new Date(scheduledAt).toISOString() } : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "پیام ثبت نشد.");
      toast.success(mode === "draft" ? "پیش‌نویس ذخیره شد." : scheduledAt ? "ارسال زمان‌بندی شد." : "پیام در صف پایدار قرار گرفت.");
      setTitle(""); setMessage(""); setLink(""); setScheduledAt(""); setPreview(null); setIdempotencyKey(crypto.randomUUID());
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "پیام ثبت نشد."); }
    finally { setWorking(""); }
  };

  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
    <header><h2 className="text-xl font-black text-slate-900">ارسال پیام</h2><p className="mt-1 text-sm text-slate-500">گیرندگان هنگام ثبت ثابت می‌شوند؛ پردازش واقعی توسط worker انجام می‌شود.</p></header>
    <div className="flex flex-wrap gap-2">{templates.map((template) => <button key={template.label} type="button" onClick={() => { setTitle(template.title); setMessage(template.message); setLink(template.link); }} className="rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700">{template.label}</button>)}</div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm text-slate-700">گروه مخاطبان<select value={kind} onChange={(event) => { setKind(event.target.value as AudienceKind); setPreview(null); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="selected">کاربران انتخابی</option><option value="all_users">همه کاربران</option><option value="product_buyers">خریداران یک محصول</option><option value="category_buyers">خریداران یک دسته</option><option value="active_orders">مشتریان دارای سفارش فعال</option></select></label>
      {kind === "selected" ? <div className="relative text-sm text-slate-700"><label htmlFor="campaign-user-search">انتخاب یک یا چند کاربر</label><div className="relative mt-1"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="campaign-user-search" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pr-9 pl-3" placeholder="نام، موبایل یا ایمیل" /></div>{users.length ? <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border bg-white p-1 shadow-xl">{users.filter((user) => !selectedUsers.some((selected) => selected._id === user._id)).map((user) => <button key={user._id} type="button" onClick={() => { setSelectedUsers((current) => [...current, user]); setUserQuery(""); setUsers([]); setPreview(null); }} className="flex w-full justify-between rounded-lg p-2 text-right hover:bg-indigo-50"><span>{user.username || "کاربر"}</span><span dir="ltr">{user.mobile}</span></button>)}</div> : null}</div> : null}
      {["product_buyers", "category_buyers"].includes(kind) ? <label className="text-sm text-slate-700">{kind === "product_buyers" ? "محصول" : "دسته"}<select value={optionId} onChange={(event) => { setOptionId(event.target.value); setPreview(null); }} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="">انتخاب کنید</option>{options.map((option) => <option key={option._id} value={option._id}>{option.title || option.name}</option>)}</select></label> : null}
      <label className="text-sm text-slate-700">عنوان<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      <label className="text-sm text-slate-700">اولویت<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="low">کم</option><option value="normal">عادی</option><option value="high">مهم</option><option value="urgent">فوری</option></select></label>
    </div>
    {selectedUsers.length ? <div className="flex flex-wrap gap-2">{selectedUsers.map((user) => <span key={user._id} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800"><Check className="h-3.5 w-3.5" />{user.username || user.mobile}<button type="button" onClick={() => { setSelectedUsers((current) => current.filter((item) => item._id !== user._id)); setPreview(null); }} aria-label={`حذف ${user.username || user.mobile}`}><X className="h-3.5 w-3.5" /></button></span>)}</div> : null}
    <label className="block text-sm text-slate-700">متن پیام<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={2000} className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm text-slate-700">لینک داخلی<input value={link} onChange={(event) => setLink(event.target.value)} dir="ltr" placeholder="/products" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-left" /></label><label className="text-sm text-slate-700">زمان ارسال (Asia/Tehran)<input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3" /></label></div>
    <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-900">پیش‌نمایش مخاطبان</p><p className="text-sm text-slate-600">{preview ? `${preview.count.toLocaleString("fa-IR")} مخاطب در snapshot ارسال` : "پیش از ثبت، تعداد واقعی مخاطبان را محاسبه کنید."}</p></div><button type="button" onClick={() => void previewAudience()} disabled={working === "preview"} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-bold text-indigo-700">{working === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}محاسبه</button></div>{preview?.sample?.length ? <p className="mt-3 text-xs text-slate-500">نمونه: {preview.sample.map((user) => user.username || user.mobile).join("، ")}</p> : null}</div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void submit("send")} disabled={Boolean(working)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{working === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{scheduledAt ? "زمان‌بندی ارسال" : "قرار دادن در صف"}</button><button type="button" onClick={() => void submit("draft")} disabled={Boolean(working)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"><Save className="h-4 w-4" />ذخیره پیش‌نویس</button></div>
  </section>;
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, RefreshCcw, RotateCcw, Send } from "lucide-react";
import { toast } from "react-toastify";

type Campaign = {
  _id: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  recipientCount: number;
  scheduledAt?: string | null;
  createdAt: string;
  stats?: { pending?: number; succeeded?: number; failed?: number; read?: number; cancelled?: number };
};

type Delivery = {
  _id: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  readAt?: string | null;
  recipientId?: { username?: string; mobile?: string; email?: string };
};

const statusLabel: Record<string, string> = {
  draft: "پیش‌نویس", scheduled: "زمان‌بندی‌شده", queued: "در صف", processing: "در حال پردازش", completed: "تکمیل‌شده", cancelled: "لغوشده",
};

export default function CampaignHistory() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [expanded, setExpanded] = useState("");
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({});

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/notification-campaigns?limit=25", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تاریخچه دریافت نشد.");
      setItems(result.campaigns || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تاریخچه دریافت نشد.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const action = async (campaign: Campaign, name: "retry" | "cancel" | "send") => {
    setPending(`${campaign._id}:${name}`);
    try {
      const response = await fetch(`/api/admin/notification-campaigns/${campaign._id}/${name}`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "عملیات انجام نشد.");
      toast.success(name === "retry" ? "موارد ناموفق دوباره در صف قرار گرفتند." : name === "send" ? "پیش‌نویس در صف ارسال قرار گرفت." : "ارسال زمان‌بندی‌شده لغو شد.");
      await load();
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "عملیات انجام نشد."); }
    finally { setPending(""); }
  };

  const toggleDetails = async (campaign: Campaign) => {
    if (expanded === campaign._id) return setExpanded("");
    setExpanded(campaign._id);
    if (deliveries[campaign._id]) return;
    setPending(`${campaign._id}:details`);
    try {
      const response = await fetch(`/api/admin/notification-campaigns/${campaign._id}?limit=100`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "جزئیات دریافت نشد.");
      setDeliveries((current) => ({ ...current, [campaign._id]: result.campaign.deliveries || [] }));
    } catch (caught) { toast.error(caught instanceof Error ? caught.message : "جزئیات دریافت نشد."); }
    finally { setPending(""); }
  };

  return <section className="space-y-4">
    <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"><div><h2 className="text-lg font-black text-slate-900">پیام‌های ارسالی</h2><p className="text-sm text-slate-500">«ثبت‌شده در صندوق» به معنی تحویل پیامک یا مشاهده قطعی نیست.</p></div><button type="button" onClick={() => void load()} aria-label="به‌روزرسانی" className="rounded-xl border p-2"><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></header>
    {error ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
    {!loading && !items.length ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">هنوز پیامی ثبت نشده است.</div> : null}
    <div className="grid gap-3">
      {items.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.message}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{statusLabel[item.status] || item.status}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
          <div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg text-slate-900">{item.recipientCount.toLocaleString("fa-IR")}</strong>مخاطب</div>
          <div className="rounded-xl bg-amber-50 p-3"><strong className="block text-lg text-amber-800">{(item.stats?.pending || 0).toLocaleString("fa-IR")}</strong>در انتظار</div>
          <div className="rounded-xl bg-emerald-50 p-3"><strong className="block text-lg text-emerald-800">{(item.stats?.succeeded || 0).toLocaleString("fa-IR")}</strong>ثبت‌شده در صندوق</div>
          <div className="rounded-xl bg-rose-50 p-3"><strong className="block text-lg text-rose-800">{(item.stats?.failed || 0).toLocaleString("fa-IR")}</strong>ناموفق</div>
          <div className="rounded-xl bg-blue-50 p-3"><strong className="block text-lg text-blue-800">{(item.stats?.read || 0).toLocaleString("fa-IR")}</strong>خوانده‌شده</div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>ثبت: {new Date(item.createdAt).toLocaleString("fa-IR")}{item.scheduledAt ? ` · زمان ارسال: ${new Date(item.scheduledAt).toLocaleString("fa-IR")}` : ""}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void toggleDetails(item)} className="rounded-lg border border-slate-200 px-3 py-2 font-bold text-slate-700">جزئیات گیرندگان</button>{item.status === "draft" ? <button type="button" onClick={() => void action(item, "send")} disabled={Boolean(pending)} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-2 font-bold text-indigo-700"><Send className="h-3.5 w-3.5" />ارسال پیش‌نویس</button> : null}{(item.stats?.failed || 0) > 0 ? <button type="button" onClick={() => void action(item, "retry")} disabled={Boolean(pending)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-2 font-bold text-amber-800">{pending === `${item._id}:retry` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}تلاش مجدد ناموفق‌ها</button> : null}{["draft", "scheduled", "queued"].includes(item.status) ? <button type="button" onClick={() => void action(item, "cancel")} disabled={Boolean(pending)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-700"><Ban className="h-3.5 w-3.5" />لغو</button> : null}</div></div>
        {expanded === item._id ? <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[640px] text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">گیرنده</th><th className="p-3">موبایل</th><th className="p-3">نتیجه</th><th className="p-3">خواندن</th><th className="p-3">تلاش</th><th className="p-3">خطا</th></tr></thead><tbody>{pending === `${item._id}:details` ? <tr><td colSpan={6} className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr> : (deliveries[item._id] || []).map((delivery) => <tr key={delivery._id} className="border-t"><td className="p-3">{delivery.recipientId?.username || "کاربر"}</td><td className="p-3" dir="ltr">{delivery.recipientId?.mobile || "---"}</td><td className="p-3">{delivery.status === "succeeded" ? "ثبت‌شده در صندوق" : delivery.status === "failed" ? "ناموفق" : delivery.status === "cancelled" ? "لغوشده" : "در انتظار"}</td><td className="p-3">{delivery.readAt ? new Date(delivery.readAt).toLocaleString("fa-IR") : "خوانده‌نشده"}</td><td className="p-3">{delivery.attempts.toLocaleString("fa-IR")}</td><td className="max-w-52 truncate p-3 text-rose-600" title={delivery.lastError || ""}>{delivery.lastError || "---"}</td></tr>)}</tbody></table></div> : null}
      </article>)}
    </div>
  </section>;
}

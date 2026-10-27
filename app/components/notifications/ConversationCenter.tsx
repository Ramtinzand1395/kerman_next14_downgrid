"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, RefreshCcw, Search, Send, UserRound } from "lucide-react";
import { toast } from "react-toastify";
import { useSearchParams } from "next/navigation";

type Conversation = {
  _id: string;
  subject: string;
  status: "waiting_store" | "waiting_customer" | "closed";
  lastMessageAt: string;
  unreadByAdmin: number;
  unreadByCustomer: number;
  customerId?: { _id: string; username?: string; mobile?: string; email?: string };
  contactSnapshot?: { name?: string; phone?: string; email?: string };
  orderId?: { _id: string; trackingCode?: string; invoiceNumber?: string; status?: string; finalPrice?: number } | null;
};

type Message = {
  _id: string;
  authorType: "customer" | "admin";
  authorId?: { username?: string; mobile?: string };
  body: string;
  createdAt: string;
};

type OrderOption = { id: string; orderNumber?: string | null; status: string; source: string };

const statusLabel = {
  waiting_store: "منتظر پاسخ فروشگاه",
  waiting_customer: "منتظر پاسخ مشتری",
  closed: "بسته‌شده",
};

export default function ConversationCenter({ admin = false }: { admin?: boolean }) {
  const searchParams = useSearchParams();
  const base = admin ? "/api/admin/conversations" : "/api/conversations";
  const [items, setItems] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState(() => searchParams.get("conversation") || "");
  const [detail, setDetail] = useState<{ conversation: Conversation; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [orders, setOrders] = useState<OrderOption[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (status) params.set("status", status);
      if (admin && search.trim()) params.set("q", search.trim());
      const response = await fetch(`${base}?${params}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "گفتگوها دریافت نشدند.");
      setItems(result.conversations || []);
      if (!selectedId && result.conversations?.length) setSelectedId(result.conversations[0]._id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "گفتگوها دریافت نشدند.");
    } finally {
      setLoading(false);
    }
  }, [admin, base, search, selectedId, status]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const response = await fetch(`${base}/${id}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "گفتگو دریافت نشد.");
      setDetail(result);
      setItems((current) => current.map((item) => item._id === id
        ? { ...item, unreadByAdmin: admin ? 0 : item.unreadByAdmin, unreadByCustomer: admin ? item.unreadByCustomer : 0 }
        : item));
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "گفتگو دریافت نشد.");
    } finally {
      setDetailLoading(false);
    }
  }, [admin, base]);

  useEffect(() => { void loadList(); }, [loadList]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); }, [loadDetail, selectedId]);
  useEffect(() => {
    if (admin) return;
    fetch("/api/profile/orders", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : Promise.reject())
      .then((result: OrderOption[]) => setOrders(result.filter((item) => item.source === "order")))
      .catch(() => setOrders([]));
  }, [admin]);

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    try {
      const response = await fetch(`${base}/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "پاسخ ثبت نشد.");
      setReply("");
      await Promise.all([loadDetail(selectedId), loadList()]);
      toast.success("پاسخ در گفتگو ثبت شد.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "پاسخ ثبت نشد.");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (nextStatus: Conversation["status"]) => {
    if (!selectedId) return;
    const response = await fetch(`${base}/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(result.error || "وضعیت گفتگو ذخیره نشد.");
    await Promise.all([loadDetail(selectedId), loadList()]);
  };

  const linkOrder = async (orderId: string) => {
    if (!selectedId) return;
    const response = await fetch(`${base}/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderId || null }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(result.error || "اتصال سفارش انجام نشد.");
    await loadDetail(selectedId);
    toast.success(orderId ? "سفارش به گفتگو متصل شد." : "اتصال سفارش حذف شد.");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div><h2 className="text-lg font-black text-slate-900">گفتگو با مشتریان</h2><p className="text-sm text-slate-500">پاسخ‌ها و وضعیت هر گفتگو به‌صورت زمانی ثبت می‌شود.</p></div>
        <button type="button" onClick={() => void loadList()} className="rounded-xl border border-slate-200 p-2 text-slate-600" aria-label="به‌روزرسانی"><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[22rem_1fr]">
        <aside className="border-b border-slate-200 lg:border-l lg:border-b-0">
          <div className="space-y-2 border-b border-slate-100 p-3">
            {admin ? <label className="relative block"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، موبایل یا موضوع" className="h-10 w-full rounded-xl border border-slate-200 pr-9 pl-3 text-sm" /></label> : null}
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"><option value="">همه وضعیت‌ها</option><option value="waiting_store">منتظر فروشگاه</option><option value="waiting_customer">منتظر مشتری</option><option value="closed">بسته‌شده</option></select>
          </div>
          <div className="max-h-[34rem] overflow-y-auto">
            {error ? <div role="alert" className="m-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
            {!loading && !items.length ? <div className="p-10 text-center text-sm text-slate-500">گفتگویی وجود ندارد.</div> : null}
            {items.map((item) => {
              const unread = admin ? item.unreadByAdmin : item.unreadByCustomer;
              return <button key={item._id} type="button" onClick={() => setSelectedId(item._id)} className={`w-full border-b border-slate-100 p-4 text-right ${selectedId === item._id ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                <span className="flex items-start justify-between gap-2"><strong className="line-clamp-1 text-sm text-slate-900">{item.subject}</strong>{unread > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">{unread.toLocaleString("fa-IR")}</span> : null}</span>
                <span className="mt-2 block text-xs text-slate-500">{statusLabel[item.status]} · {new Date(item.lastMessageAt).toLocaleString("fa-IR")}</span>
              </button>;
            })}
          </div>
        </aside>
        <div className="flex min-h-[32rem] flex-col">
          {!selectedId ? <div className="m-auto text-center text-sm text-slate-500"><MessageCircle className="mx-auto mb-3 h-8 w-8" />یک گفتگو را انتخاب کنید.</div> : null}
          {detailLoading ? <div className="m-auto flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />در حال دریافت گفتگو…</div> : null}
          {detail && !detailLoading ? <>
            <header className="border-b border-slate-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{detail.conversation.subject}</h3><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><UserRound className="h-3.5 w-3.5" />{detail.conversation.customerId?.username || detail.conversation.contactSnapshot?.name || "مشتری"} · {detail.conversation.customerId?.mobile || detail.conversation.contactSnapshot?.phone}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{statusLabel[detail.conversation.status]}</span></div>
              {detail.conversation.orderId ? <p className="mt-3 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">سفارش مرتبط: {detail.conversation.orderId.trackingCode || detail.conversation.orderId.invoiceNumber || detail.conversation.orderId._id} · {detail.conversation.orderId.status}</p> : null}
              {!admin ? <label className="mt-3 block text-xs text-slate-500">سفارش مرتبط (اختیاری)<select value={detail.conversation.orderId?._id || ""} onChange={(event) => void linkOrder(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="">بدون سفارش</option>{orders.map((order) => <option key={order.id} value={order.id}>سفارش {order.orderNumber || order.id.slice(-8)} · {order.status}</option>)}</select></label> : null}
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4">
              {detail.messages.map((message) => <article key={message._id} className={`max-w-[88%] rounded-2xl p-3 shadow-sm ${message.authorType === "admin" ? "mr-auto bg-indigo-600 text-white" : "ml-auto border border-slate-200 bg-white text-slate-800"}`}><p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p><p className={`mt-1 text-[11px] ${message.authorType === "admin" ? "text-indigo-100" : "text-slate-400"}`}>{message.authorType === "admin" ? "فروشگاه" : message.authorId?.username || "مشتری"} · {new Date(message.createdAt).toLocaleString("fa-IR")}</p></article>)}
            </div>
            <footer className="border-t border-slate-100 p-4">
              {detail.conversation.status === "closed" ? <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />این گفتگو بسته شده است.</span>{admin ? <button type="button" onClick={() => void changeStatus("waiting_customer")} className="font-bold text-indigo-700">بازگشایی</button> : null}</div> : <form onSubmit={sendReply} className="flex items-end gap-2"><label className="flex-1 text-sm text-slate-600">پاسخ<textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 p-3" /></label><button disabled={sending || !reply.trim()} className="mb-0.5 inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}ارسال</button></form>}
              {detail.conversation.status !== "closed" ? <button type="button" onClick={() => void changeStatus("closed")} className="mt-2 text-xs font-bold text-slate-500 hover:text-rose-600">بستن گفتگو</button> : null}
            </footer>
          </> : null}
        </div>
      </div>
    </section>
  );
}

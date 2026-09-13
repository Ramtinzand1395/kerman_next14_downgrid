"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";

interface UserOption { _id: string; username?: string; mobile: string; email?: string }

export default function AdminNotificationComposer() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState<"user" | "allUsers">("user");
  const [recipientId, setRecipientId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");

  useEffect(() => {
    if (session?.user.role !== "superadmin") return;
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/notifications/recipients?q=${encodeURIComponent(userQuery)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { users: UserOption[] }) => setUsers(data.users))
      .catch(() => toast.error("فهرست کاربران دریافت نشد."));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [session?.user.role, userQuery]);

  if (session?.user.role !== "superadmin") return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, recipientId: recipient === "user" ? recipientId : undefined, title, message, priority, link }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "ارسال اعلان انجام نشد.");
      toast.success(`اعلان برای ${Number(result.sentCount).toLocaleString("fa-IR")} کاربر ارسال شد.`);
      setTitle(""); setMessage(""); setLink("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ارسال اعلان انجام نشد.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div><h2 className="text-lg font-bold text-slate-900">ارسال اعلان به کاربران</h2><p className="mt-1 text-sm text-slate-500">پیام اختصاصی یا عمومی در مرکز اعلان کاربران ذخیره می‌شود.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-700">گیرنده
          <select value={recipient} onChange={(event) => setRecipient(event.target.value as "user" | "allUsers")} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400">
            <option value="user">یک کاربر</option><option value="allUsers">همه کاربران</option>
          </select>
        </label>
        {recipient === "user" ? (
          <label className="space-y-1 text-sm text-slate-700">کاربر
            <input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder="جستجو با نام، موبایل یا ایمیل" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
            <select required value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400">
              <option value="">انتخاب کاربر</option>
              {users.map((user) => <option key={user._id} value={user._id}>{user.username || "کاربر"} - {user.mobile}</option>)}
            </select>
          </label>
        ) : <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">این اعلان برای تمام کاربران عادی ارسال می‌شود.</div>}
        <label className="space-y-1 text-sm text-slate-700">عنوان
          <input required minLength={2} maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400" />
        </label>
        <label className="space-y-1 text-sm text-slate-700">اولویت
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 outline-none focus:border-indigo-400">
            <option value="low">کم</option><option value="normal">عادی</option><option value="high">مهم</option><option value="urgent">فوری</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm text-slate-700">متن اعلان
        <textarea required minLength={2} maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-indigo-400" />
      </label>
      <label className="block space-y-1 text-sm text-slate-700">لینک داخلی (اختیاری)
        <input dir="ltr" placeholder="/products" value={link} onChange={(event) => setLink(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-left outline-none focus:border-indigo-400" />
      </label>
      <button disabled={sending} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Send className="h-4 w-4" /> {sending ? "در حال ارسال..." : "ارسال اعلان"}</button>
    </form>
  );
}

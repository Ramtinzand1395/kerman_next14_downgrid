"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { ButtonLoading } from "@/app/components/loading/LoadingSystem";

interface UserOption { _id: string; username?: string; mobile: string; email?: string }

function userLabel(user: UserOption) {
  return `${user.username || "کاربر"} - ${user.mobile}`;
}

export default function AdminNotificationComposer() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState<"user" | "allUsers">("user");
  const [recipientId, setRecipientId] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [link, setLink] = useState("");

  const selectedUserLabel = useMemo(
    () => (selectedUser ? userLabel(selectedUser) : ""),
    [selectedUser],
  );

  useEffect(() => {
    if (session?.user.role !== "superadmin" || recipient !== "user") return;
    const query = userQuery.trim();
    if (query.length < 2 || (selectedUser && query === selectedUserLabel)) {
      setUsers([]);
      setUsersLoading(false);
      setUsersError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setUsersLoading(true);
      setUsersError("");
      fetch(`/api/admin/notifications/recipients?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((data: { users: UserOption[] }) => setUsers(data.users))
        .catch((error) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setUsers([]);
          setUsersError("نتیجه جستجوی کاربران دریافت نشد؛ دوباره تلاش کنید.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setUsersLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recipient, selectedUser, selectedUserLabel, session?.user.role, userQuery]);

  if (session?.user.role !== "superadmin") return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recipient === "user" && !recipientId) {
      toast.error("ابتدا یک کاربر را از نتایج جستجو انتخاب کنید.");
      return;
    }
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
      toast.error(
        error instanceof Error
          ? error.message
          : "اعلان ارسال نشد؛ گیرندگان را بررسی و دوباره تلاش کنید.",
      );
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
          <div className="relative space-y-1 text-sm text-slate-700">
            <label htmlFor="notification-recipient-search">کاربر</label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="notification-recipient-search"
                value={userQuery}
                onChange={(event) => {
                  setUserQuery(event.target.value);
                  if (selectedUser) {
                    setSelectedUser(null);
                    setRecipientId("");
                  }
                }}
                placeholder="حداقل ۲ حرف از نام، موبایل یا ایمیل"
                autoComplete="off"
                role="combobox"
                aria-expanded={users.length > 0}
                aria-controls="notification-recipient-results"
                className="h-11 w-full rounded-xl border border-slate-200 px-10 outline-none focus:border-indigo-400"
              />
              {usersLoading && <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />}
            </div>
            {!selectedUser && userQuery.trim().length > 0 && userQuery.trim().length < 2 && (
              <p className="text-xs text-slate-500">برای شروع جستجو حداقل ۲ حرف وارد کنید.</p>
            )}
            {usersError && <p className="text-xs text-rose-600">{usersError}</p>}
            {!usersLoading && !usersError && userQuery.trim().length >= 2 && !selectedUser && users.length === 0 && (
              <p className="text-xs text-slate-500">کاربری با این مشخصات پیدا نشد.</p>
            )}
            {users.length > 0 && (
              <div id="notification-recipient-results" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                {users.map((user) => (
                  <button
                    key={user._id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      setSelectedUser(user);
                      setRecipientId(user._id);
                      setUserQuery(userLabel(user));
                      setUsers([]);
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-right hover:bg-indigo-50"
                  >
                    <span>
                      <span className="block font-semibold text-slate-800">{user.username || "کاربر"}</span>
                      {user.email && <span className="block text-xs text-slate-500">{user.email}</span>}
                    </span>
                    <span dir="ltr" className="shrink-0 text-xs text-slate-600">{user.mobile}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
                <span className="inline-flex min-w-0 items-center gap-2"><Check className="h-4 w-4 shrink-0" /><span className="truncate">{selectedUserLabel}</span></span>
                <button
                  type="button"
                  aria-label="حذف کاربر انتخاب‌شده"
                  onClick={() => {
                    setSelectedUser(null);
                    setRecipientId("");
                    setUserQuery("");
                  }}
                  className="rounded-lg p-1 hover:bg-emerald-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
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
      <button disabled={sending} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{sending ? <ButtonLoading label="در حال ارسال…" /> : <><Send className="h-4 w-4" /> ارسال اعلان</>}</button>
    </form>
  );
}

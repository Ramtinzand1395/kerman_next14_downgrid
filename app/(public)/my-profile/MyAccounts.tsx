"use client";

import { useEffect, useState } from "react";
import { AlertCircle, BookOpen, Check, Clock3, Copy, Eye, EyeOff, KeyRound, MessageCircle, RotateCw } from "lucide-react";
import ProductImage from "@/app/components/ProductImage";
import Link from "@/app/components/navigation/NavigationFeedback";
import type { GameAccount } from "@/lib/game-account-delivery";
import { profileRoute } from "@/lib/profileRoutes";

type AccountsState =
  | { status: "loading" | "error" | "unauthorized" }
  | { status: "loaded"; accounts: GameAccount[] };

const deliveryStatus = {
  ready: { label: "آماده استفاده", icon: Check, color: "bg-emerald-50 text-emerald-800" },
  pending: { label: "در انتظار تحویل", icon: Clock3, color: "bg-amber-50 text-amber-900" },
  unavailable: { label: "خطا در نمایش اطلاعات", icon: AlertCircle, color: "bg-rose-50 text-rose-800" },
};

const actionClass = "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function Credential({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [copyFailed, setCopyFailed] = useState(false);
  const concealed = secret && !visible;
  const VisibilityIcon = visible ? EyeOff : Eye;

  async function copy() {
    setFeedback("");
    try {
      await navigator.clipboard.writeText(value);
      setCopyFailed(false);
      setFeedback(`${label} کپی شد.`);
    } catch {
      setCopyFailed(true);
      setFeedback("کپی انجام نشد. دوباره تلاش کنید.");
    }
  }

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2">
      <dt className="pt-1 text-xs font-medium text-slate-600">{label}</dt>
      <dd>
        <bdi
          dir="ltr"
          aria-label={concealed ? "رمز عبور مخفی است" : undefined}
          className="mt-1 block select-all whitespace-pre-wrap break-all text-right font-mono text-sm leading-6 text-slate-900"
        >
          {concealed ? "••••••••" : value}
        </bdi>
        <div className="mt-1 flex flex-wrap gap-1">
          <button type="button" onClick={copy} aria-label={`کپی ${label}`} className={actionClass}>
            <Copy aria-hidden="true" className="h-4 w-4" />
            کپی
          </button>
          {secret && (
            <button
              type="button"
              aria-label={visible ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
              onClick={() => setVisible(!visible)}
              className={actionClass}
            >
              <VisibilityIcon aria-hidden="true" className="h-4 w-4" />
              {visible ? "مخفی کردن" : "نمایش"}
            </button>
          )}
        </div>
        <p role="status" className={`text-xs leading-6 ${copyFailed ? "text-rose-700" : "text-emerald-800"}`}>
          {feedback}
        </p>
      </dd>
    </div>
  );
}

function AccountCard({ account }: { account: GameAccount }) {
  const { label, icon: StatusIcon, color } = deliveryStatus[account.status];

  return (
    <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-5">
        {account.image && (
          <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-24">
            <ProductImage src={account.image} alt={account.title} fill sizes="(min-width: 640px) 96px, 64px" className="object-cover" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 dir="auto" className="max-w-full text-start text-base font-bold leading-6 text-slate-900 [overflow-wrap:anywhere] sm:text-lg">{account.title}</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>
              <StatusIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {label}
            </span>
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs leading-5 text-slate-600">
            {account.platform && <div><dt className="sr-only">پلتفرم</dt><dd dir="ltr" className="font-semibold text-indigo-800">{account.platform}</dd></div>}
            {account.capacity && <div className="flex flex-wrap gap-x-1"><dt>ظرفیت</dt><dd className="font-semibold text-slate-800">{account.capacity}</dd></div>}
            {account.variant && <div className="flex flex-wrap gap-x-1"><dt>نسخه</dt><dd className="font-semibold text-slate-800 [overflow-wrap:anywhere]">{account.variant}</dd></div>}
            <div className="flex flex-wrap gap-x-1"><dt>شماره سفارش</dt><dd dir="ltr" className="break-all font-semibold text-slate-800">{account.orderNumber}</dd></div>
          </dl>
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 bg-slate-50 px-3 py-3 sm:px-5">
        {account.status === "ready" ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            <Credential label="ایمیل اکانت" value={account.credentials.email} />
            <Credential label="رمز عبور" value={account.credentials.password} secret />
          </dl>
        ) : (
          <p className="text-sm leading-7 text-slate-700">
            {account.status === "pending"
              ? "اطلاعات ورود پس از تحویل در همین کارت نمایش داده می‌شود."
              : "برای پیگیری اطلاعات ورود با پشتیبانی در ارتباط باشید."}
          </p>
        )}
        {account.guide.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-white px-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 py-2 text-sm font-semibold text-indigo-800 focus-visible:outline-indigo-600">
              <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" />
              راهنمای استفاده و نصب
              <span aria-hidden="true" className="mr-auto text-indigo-500">⌄</span>
            </summary>
            <dl className="space-y-2 border-t border-slate-100 py-3 text-sm leading-7 text-slate-700">
              {account.guide.map(({ key, value }, index) => (
                <div key={`${key}-${index}`}>
                  <dt className="font-semibold text-slate-900">{key}</dt>
                  <dd dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <Link href={profileRoute("conversations")} className={actionClass}>
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          پشتیبانی
        </Link>
      </div>
    </article>
  );
}

export default function MyAccounts() {
  const [state, setState] = useState<AccountsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const request = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/profile/game-accounts", { cache: "no-store", signal: request.signal });
        if (response.status === 401) {
          if (!request.signal.aborted) setState({ status: "unauthorized" });
          return;
        }
        if (!response.ok) throw new Error();
        const accounts: GameAccount[] = await response.json();
        if (!request.signal.aborted) setState({ status: "loaded", accounts });
      } catch {
        if (!request.signal.aborted) setState({ status: "error" });
      }
    }

    void load();
    return () => request.abort();
  }, [attempt]);

  return (
    <section aria-labelledby="accounts-heading" className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-3 text-indigo-700"><KeyRound aria-hidden="true" className="h-5 w-5" /></span>
        <div>
          <h1 id="accounts-heading" className="text-lg font-bold text-slate-900 sm:text-xl">اکانت‌های من</h1>
          <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">وضعیت تحویل و اطلاعات ورود بازی‌های اکانتی خریداری‌شده</p>
        </div>
      </div>

      {state.status === "loading" && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
          در حال دریافت اکانت‌ها…
          <div aria-hidden="true" className="mt-4 h-12 w-full rounded-xl bg-slate-100" />
        </div>
      )}
      {(state.status === "error" || state.status === "unauthorized") && (
        <div className="rounded-2xl border border-rose-200 bg-white p-5">
          <p role="alert" className="text-sm font-semibold leading-6 text-rose-800">
            {state.status === "unauthorized" ? "برای مشاهده اکانت‌ها وارد حساب کاربری شوید." : "دریافت اکانت‌ها ممکن نشد."}
          </p>
          {state.status === "unauthorized" ? (
            <Link href="/auth/login?callbackUrl=%2Fmy-profile%3Fstep%3D12" className={`mt-2 ${actionClass}`}>ورود به حساب کاربری</Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt(current => current + 1);
              }}
              className={`mt-2 ${actionClass}`}
            >
              <RotateCw aria-hidden="true" className="h-4 w-4" />
              تلاش دوباره
            </button>
          )}
        </div>
      )}
      {state.status === "loaded" && (
        state.accounts.length ? state.accounts.map(account => <AccountCard key={account.id} account={account} />) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center">
            <KeyRound aria-hidden="true" className="mx-auto mb-3 h-7 w-7 text-indigo-600" />
            <h2 className="font-bold text-slate-900">هنوز بازی اکانتی خریداری نکرده‌اید</h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">پس از خرید، وضعیت تحویل بازی را اینجا می‌بینید.</p>
          </div>
        )
      )}
    </section>
  );
}

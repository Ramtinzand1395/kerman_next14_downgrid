// lib/loyalty/ui.ts
// ثابت‌ها و کمک‌توابع نمایشی مشترک UI باشگاه مشتریان (سمت کاربر و ادمین)
import {
  WalletTxStatus,
  WalletTxType,
  XpReason,
  SpinPrizeType,
} from "@/types/loyalty";

/** قالب‌بندی مبلغ به تومان با جداکننده فارسی */
export function toman(amount?: number | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `${Number(amount).toLocaleString("fa-IR")} تومان`;
}

/** قالب‌بندی عدد ساده فارسی */
export function faNum(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("fa-IR");
}

export const WALLET_TX_TYPE_FA: Record<WalletTxType, string> = {
  charge: "شارژ کیف پول",
  payment: "پرداخت سفارش",
  refund: "بازگشت وجه",
  cashback: "کش‌بک",
  gift: "هدیه",
  referral_reward: "پاداش معرفی",
  spin_reward: "جایزه گردونه",
  mission_reward: "پاداش ماموریت",
  expire: "انقضای اعتبار",
  admin_adjust: "تعدیل مدیر",
};

export const WALLET_TX_STATUS_FA: Record<WalletTxStatus, string> = {
  pending: "در انتظار",
  completed: "موفق",
  failed: "ناموفق",
  cancelled: "لغوشده",
};

/** رنگ وضعیت تراکنش برای Badge */
export const WALLET_TX_STATUS_CLASS: Record<WalletTxStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

export const XP_REASON_FA: Record<XpReason, string> = {
  signup: "ثبت‌نام",
  first_purchase: "اولین خرید",
  purchase: "خرید",
  review: "ثبت نظر",
  consecutive_purchase: "خرید متوالی",
  referral: "دعوت دوستان",
  daily_login: "ورود روزانه",
  campaign: "کمپین",
  mission: "ماموریت",
  spin: "گردونه شانس",
  admin_grant: "اعطای مدیر",
};

export const SPIN_PRIZE_TYPE_FA: Record<SpinPrizeType, string> = {
  wallet_credit: "اعتبار کیف پول",
  xp: "امتیاز (XP)",
  coupon: "کد تخفیف",
  free_shipping: "ارسال رایگان",
  special_gift: "هدیه ویژه",
  nothing: "پوچ",
};

/** رنگ‌های ثابت بخش‌های گردونه شانس */
export const SPIN_SEGMENT_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ec4899",
  "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6",
  "#e11d48", "#84cc16",
];

/** شکل پاسخ استاندارد API پروژه */
export type ApiResult<T> = { ok: boolean; data?: T; error?: string };

/** fetch با پاسخ استاندارد { ok, data, error } */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const json = (await res.json()) as ApiResult<T>;
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "خطا در برقراری ارتباط" };
    }
    return { ok: true, data: json.data };
  } catch {
    return { ok: false, error: "خطای شبکه — اتصال اینترنت را بررسی کنید" };
  }
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

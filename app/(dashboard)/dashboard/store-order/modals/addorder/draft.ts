import { Customer, storeOrder } from "@/types";

export const STORE_ORDER_DRAFT_KEY = "store-order-draft";

export type StoreOrderDraft = {
  activeStep?: number;
  customerData?: Partial<Customer>;
  order?: Partial<storeOrder>;
};

// خواندن پیش‌نویس ذخیره‌شده (در صورت خطا، مرورگر قفل شده و یا JSON خراب → null)
export function readStoreOrderDraft(): StoreOrderDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORE_ORDER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoreOrderDraft;
  } catch {
    return null;
  }
}

// ادغام و ذخیره بخشی از پیش‌نویس بدون حذف بخش‌های دیگر
export function writeStoreOrderDraft(patch: StoreOrderDraft) {
  if (typeof window === "undefined") return;

  try {
    const prev = readStoreOrderDraft() || {};
    window.localStorage.setItem(
      STORE_ORDER_DRAFT_KEY,
      JSON.stringify({ ...prev, ...patch }),
    );
  } catch {
    // noop — پر بودن storage نباید جلوی فرم را بگیرد
  }
}

export function clearStoreOrderDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORE_ORDER_DRAFT_KEY);
  } catch {
    // noop
  }
}

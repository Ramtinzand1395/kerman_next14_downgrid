// /helpers/sendPdfToBackend.ts

import { Customer, storeOrder } from "@/types";
import { toast } from "react-toastify";
import { buildPrintPayload } from "@/lib/print/store-order-payload";

const pendingPrintOrderIds = new Set<string>();

const PRINT_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "نشست شما منقضی شده است؛ دوباره وارد حساب کاربری شوید.",
  FORBIDDEN: "شما اجازه ارسال سفارش به صف چاپ را ندارید.",
  INVALID_PRINT_PAYLOAD:
    "اطلاعات سفارش برای چاپ معتبر نیست؛ مشخصات سفارش را بررسی کنید.",
  PRINT_PAYLOAD_TOO_LARGE: "اطلاعات سفارش برای چاپ بیش از حد مجاز است.",
  PRINT_QUEUE_UNAVAILABLE:
    "صف چاپ در دسترس نیست؛ چند لحظه دیگر دوباره تلاش کنید.",
};

const DEFAULT_PRINT_ERROR =
  "سفارش به صف چاپ اضافه نشد؛ اتصال چاپگر را بررسی کنید.";

export const getPrintErrorMessage = (data: unknown, status: number) => {
  if (data && typeof data === "object") {
    const response = data as { error?: unknown; message?: unknown };
    const code =
      response.error && typeof response.error === "object"
        ? (response.error as { code?: unknown }).code
        : response.error;

    if (typeof code === "string" && PRINT_ERROR_MESSAGES[code]) {
      return PRINT_ERROR_MESSAGES[code];
    }
    if (typeof response.message === "string" && response.message.trim()) {
      return response.message;
    }
  }

  if (status === 401) return PRINT_ERROR_MESSAGES.UNAUTHENTICATED;
  if (status === 403) return PRINT_ERROR_MESSAGES.FORBIDDEN;
  if (status === 413) return PRINT_ERROR_MESSAGES.PRINT_PAYLOAD_TOO_LARGE;
  return DEFAULT_PRINT_ERROR;
};

export const sendPdfToBackend = async (
  userOrder: storeOrder | null,
  customer: Customer | null,
) => {
  if (!userOrder) {
    toast.warning("اطلاعات سفارش کامل نیست؛ سفارش را دوباره بررسی کنید.");
    return false;
  }

  const orderId = userOrder._id;
  if (pendingPrintOrderIds.has(orderId)) {
    toast.info("درخواست چاپ این سفارش در حال ارسال است.");
    return false;
  }
  pendingPrintOrderIds.add(orderId);

  try {
    const printPayload = buildPrintPayload(userOrder, customer);

    // ارسال دیتای ساختاریافته به بک‌اند
    const res = await fetch("/api/admin/store-order/print", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(printPayload),
    });

    const data: unknown = await res.json().catch(() => null);

    if (
      res.ok &&
      data &&
      typeof data === "object" &&
      (data as { success?: unknown }).success === true
    ) {
      toast.success("سفارش به صف چاپ اضافه شد.");
      return true;
    }

    throw new Error(getPrintErrorMessage(data, res.status));
  } catch (err: unknown) {
    console.error(err);
    const message =
      err instanceof Error && /[\u0600-\u06ff]/u.test(err.message)
        ? err.message
        : DEFAULT_PRINT_ERROR;
    toast.error(message);
    return false;
  } finally {
    pendingPrintOrderIds.delete(orderId);
  }
};

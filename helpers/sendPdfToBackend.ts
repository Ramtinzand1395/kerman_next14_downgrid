// /helpers/sendPdfToBackend.ts

import { Customer, storeOrder } from "@/types";
import { toast } from "react-toastify";
import { toPersianDate } from "@/helpers/toPersianDate";

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

const printableStorage = (value: unknown) => {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return "";
};

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

export const buildPrintPayload = (
  userOrder: storeOrder,
  customer: Customer | null,
) => {
  const gamesList = Array.isArray(userOrder.list)
    ? userOrder.list.map((item) => ({
        name: item?.name || "بدون نام",
        sizeGB: item?.size ?? 0,
        price: item?.price ?? 0,
        storage: printableStorage(item?.storage),
      }))
    : [];

  const calculatedTotalSize =
    userOrder.totalSize ??
    gamesList.reduce((acc, game) => acc + game.sizeGB, 0);

  return {
    receiptType: userOrder.consoleType || "store_order",
    fullName: customer
      ? `${customer.name || ""} ${customer.lastName || ""}`.trim()
      : "مشتری متفرقه",
    mobile: customer?.mobile || "---",
    date: toPersianDate(userOrder.createdAt) || new Date().toISOString(),
    games: gamesList,
    price: userOrder.price ?? 0,
    totalSizeGB: calculatedTotalSize,
    customerDescription: userOrder.description || customer?.description || "",
  };
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

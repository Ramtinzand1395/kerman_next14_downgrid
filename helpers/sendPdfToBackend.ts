// /helpers/sendPdfToBackend.ts

import { Customer, storeOrder } from "@/types";
import { toast } from "react-toastify";

export const sendPdfToBackend = async (
  userOrder: storeOrder | null,
  customer: Customer | null,
) => {
  if (!userOrder) {
    toast.error("اطلاعات سفارش ناقص است.");
    return;
  }

  try {
    // تبدیل امن لیست بازی‌ها بر اساس ساختار واقعی دریافتی از دیتابیس
    const gamesList = Array.isArray(userOrder.list)
      ? userOrder.list.map((item: any) => ({
          name: item?.name || "بدون نام",
          sizeGB: item?.size || 0,
          storage: item?.price || 0, // در صورت نیاز به ذخیره قیمت تک تک بازی‌ها
        }))
      : [];

    // محاسبه مجموع حجم در صورتی که فیلد totalSize در خود سفارش وجود نداشته باشد
    const calculatedTotalSize =
      userOrder.totalSize ||
      gamesList.reduce((acc, game) => acc + game.sizeGB, 0);

    const printPayload = {
      id: userOrder._id,
      receiptType: userOrder.consoleType || "store_order",
      fullName: customer
        ? `${customer.name || ""} ${customer.lastName || ""}`.trim()
        : "مشتری متفرقه",
      mobile: customer?.mobile || "---",
      date: userOrder.createdAt || new Date().toISOString(),
      games: gamesList,
      price: userOrder.price || 0,
      totalSizeGB: calculatedTotalSize,
      customerDescription: userOrder.description || customer?.description || "",
    };

    // ارسال دیتای ساختاریافته به بک‌اند
    const res = await fetch("/api/admin/store-order/print", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(printPayload),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      toast.success("سفارش برای چاپ به صف ویندوز ارسال شد.");
    } else {
      throw new Error(data.error || "خطا در ثبت درخواست چاپ");
    }
  } catch (err: any) {
    console.error(err);
    toast.error(err.message || "ارسال با خطا مواجه شد.");
  }
};

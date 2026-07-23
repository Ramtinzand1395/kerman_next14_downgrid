// // import vazirFontBase64 from "@/lib/base copy";
// // import LogoBase64 from "@/lib/LogoBase64";
// // import jsPDF from "jspdf";
// // import { Customer, storeOrder } from "@/types";
// // import { toast } from "react-toastify";
// // import { toPersianDate } from "./toPersianDate";

// // const isEnglish = (text: string) => /[a-zA-Z]/.test(text);


// // const getGames = (list: unknown): string[] => {
// //   if (!list) return [];

// //   if (Array.isArray(list)) {
// //     if (list.length === 1 && typeof list[0] === "string") {
// //       const first = list[0].trim();
// //       try {
// //         const parsed = JSON.parse(first);
// //         if (Array.isArray(parsed)) {
// //           return parsed.map((x) => String(x).trim()).filter(Boolean);
// //         }
// //       } catch {
// //         return [first].filter(Boolean);
// //       }
// //     }
// //     return list.map((x) => String(x).trim()).filter(Boolean);
// //   }

// //   if (typeof list === "string") {
// //     const s = list.trim();
// //     try {
// //       const parsed = JSON.parse(s);
// //       if (Array.isArray(parsed)) {
// //         return parsed.map((x) => String(x).trim()).filter(Boolean);
// //       }
// //     } catch {
// //       return s
// //         .split(",")
// //         .map((x) => x.trim())
// //         .filter(Boolean);
// //     }
// //   }

// //   return [];
// // };

// // const generatePDF = (
// //   userOrder: storeOrder | null,
// //   customer: Customer | null,
// // ) => {
// //   const fontSize = 12;
// //   const lineHeight = 6;
// //   const padding = 4;

// //   const doc = new jsPDF({
// //     orientation: "portrait",
// //     unit: "mm",
// //     format: [80, 297],
// //   });

// //   doc.addFileToVFS("BNAZANB.ttf", vazirFontBase64);
// //   doc.addFont("BNAZANB.ttf", "BNAZANB", "normal");
// //   doc.setFont("BNAZANB");
// //   doc.setFontSize(fontSize);

// //   doc.addImage(LogoBase64, "PNG", 30, 2, 10, 10);

// //   let currentY = padding + 12;

// //   const lines: { text: string; align: "right" | "left" }[] = [];

// //   lines.push({ text: "اطلاعات کاربر", align: "right" });

// //   if (customer) {
// //     lines.push({
// //       text: `نام خانوادگی: ${customer.lastName || ""}`,
// //       align: "right",
// //     });
// //     lines.push({ text: `موبایل: ${customer.mobile || ""}`, align: "right" });
// //   }

// //   lines.push({ text: "===========================", align: "right" });
// //   lines.push({ text: "اطلاعات سفارش", align: "right" });

// //   if (userOrder) {
// //     lines.push({
// //       text: `تاریخ: ${toPersianDate(userOrder.createdAt) || ""}`,
// //       align: "right",
// //     });
// //     lines.push({
// //       text: `قیمت: ${userOrder.price?.toLocaleString() || "0"} تومان`,
// //       align: "right",
// //     });

// //     lines.push({ text: "===========================", align: "right" });

// //     const games = getGames(userOrder.list);

// //     if (games.length) {
// //       lines.push({ text: "لیست بازی‌ها:", align: "right" });

// //       games.forEach((game, idx) => {
// //         const wrapped = doc.splitTextToSize(`${idx + 1}) ${game}`, 70);
// //         wrapped.forEach((wLine: string) => {
// //           lines.push({ text: wLine, align: "left" });
// //         });
// //       });
// //     }

// //     lines.push({ text: "===========================", align: "right" });

// //     const desc = `توضیحات: ${userOrder.description || ""}`;
// //     const descWrapped = doc.splitTextToSize(desc, 70);
// //     descWrapped.forEach((wLine: string) => {
// //       lines.push({ text: wLine, align: "right" });
// //     });

// //     lines.push({ text: "===========================", align: "right" });
// //     lines.push({ text: "محل امضا مشتری", align: "right" });
// //     lines.push({ text: " ", align: "right" });
// //     lines.push({ text: " ", align: "right" });
// //   }

// //   // Print lines
// //   lines.forEach(({ text, align }) => {
// //     const font = isEnglish(text) ? "Helvetica" : "BNAZANB";
// //     doc.setFont(font, "normal");

// //     const x = align === "right" ? 75 : 5;
// //     doc.text(text, x, currentY, { align });
// //     currentY += lineHeight;
// //   });

// //   return doc.output("blob");
// // };

// // export const sendPdfToBackend = async (
// //   userOrder: storeOrder | null,
// //   customer: Customer | null,
// // ) => {
// //   try {
// //     const pdfBlob = generatePDF(userOrder, customer);

// //     const formData = new FormData();
// //     formData.append("file", pdfBlob, "ticket.pdf");

// //     const res = await fetch("/api/admin/store-order/print", {
// //       method: "POST",
// //       body: formData,
// //     });

// //     if (res.ok) toast.success("فایل برای چاپ ارسال شد.");
// //     else toast.error("خطا در ارسال فایل.");
// //   } catch (err) {
// //     console.error(err);
// //     toast.error("ارسال با خطا مواجه شد.");
// //   }
// // };

// // /helpers/sendPdfToBackend.ts (می‌توانید نام فایل را به sendOrderToPrintQueue تغییر دهید یا در همین فایل ذخیره کنید)

// import { Customer, storeOrder } from "@/types";
// import { toast } from "react-toastify";

// // تابع کمکی برای استخراج بازی‌ها
// const getGames = (list: unknown): string[] => {
//   if (!list) return [];
//   if (Array.isArray(list)) {
//     if (list.length === 1 && typeof list[0] === "string") {
//       const first = list[0].trim();
//       try {
//         const parsed = JSON.parse(first);
//         if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
//       } catch {
//         return [first].filter(Boolean);
//       }
//     }
//     return list.map((x) => String(x).trim()).filter(Boolean);
//   }
//   if (typeof list === "string") {
//     const s = list.trim();
//     try {
//       const parsed = JSON.parse(s);
//       if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
//     } catch {
//       return s.split(",").map((x) => x.trim()).filter(Boolean);
//     }
//   }
//   return [];
// };

// export const sendPdfToBackend = async (
//   userOrder: storeOrder | null,
//   customer: Customer | null,
// ) => {
//   if (!userOrder) {
//     toast.error("اطلاعات سفارش ناقص است.");
//     return;
//   }
// console.log(userOrder,"userOrder")
//   try {
//     // قالب‌بندی دیتای سفارش متناسب با ساختاری که اپلیکیشن ویندوزی شما انتظار دارد
//     const printPayload = {
//       id: userOrder._id,
//       receiptType: userOrder.consoleType || "store_order",
//       fullName: customer ? `${customer.name || ""} ${customer.lastName || ""}`.trim() : "مشتری متفرقه",
//       mobile: customer?.mobile || "---",
//       date: userOrder.createdAt || new Date().toISOString(),
//       games: getGames(userOrder.list).map((data) => ({
//         name: data.name,
//         sizeGB: data.size, // یا هر مقداری که در دیتابیس دارید
//         storage: data.price,
//       })),
//       price: userOrder.price || 0,
//       totalSizeGB: userOrder.totalSize || 0, // در صورت وجود در تایپ‌ها
//       customerDescription: userOrder.description || customer?.description || "",
//     };
// console.log(printPayload,"payload")
//     // ارسال دیتای JSON به بک‌اند
//     const res = await fetch("/api/admin/store-order/print", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(printPayload),
//     });

//     const data = await res.json();

//     if (res.ok && data.success) {
//       toast.success("سفارش برای چاپ به صف ویندوز ارسال شد.");
//     } else {
//       throw new Error(data.error || "خطا در ثبت درخواست چاپ");
//     }
//   } catch (err: any) {
//     console.error(err);
//     toast.error(err.message || "ارسال با خطا مواجه شد.");
//   }
// };

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
    const calculatedTotalSize = userOrder.totalSize || gamesList.reduce((acc, game) => acc + game.sizeGB, 0);

    const printPayload = {
      id: userOrder._id,
      receiptType: userOrder.consoleType || "store_order",
      fullName: customer ? `${customer.name || ""} ${customer.lastName || ""}`.trim() : "مشتری متفرقه",
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

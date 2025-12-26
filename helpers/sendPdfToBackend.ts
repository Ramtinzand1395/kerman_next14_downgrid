import vazirFontBase64 from "@/lib/base copy";
import LogoBase64 from "@/lib/LogoBase64";
import jsPDF from "jspdf";
import { Customer, storeOrder } from "@/types";
import { toast } from "react-toastify";
import { toPersianDate } from "./toPersianDate";
// todo
// ساعت اشتباه
// ساعت اس ام اس هم اشتباه برای تحویل اس ام اسی
const isEnglish = (text: string) => /[a-zA-Z]/.test(text);

const generatePDF = (
  userOrder: storeOrder | null,
  customer: Customer | null
) => {
  const fontSize = 12;
  const lineHeight = 6;
  const padding = 4;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [80, 297],
  });

  doc.addFileToVFS("BNAZANB.ttf", vazirFontBase64);
  doc.addFont("BNAZANB.ttf", "BNAZANB", "normal");
  doc.setFont("BNAZANB");
  doc.setFontSize(fontSize);

  doc.addImage(LogoBase64, "PNG", 30, 2, 10, 10);

  let currentY = padding;

  const lines: { text: string; align: "right" | "left" }[] = [];

  lines.push({ text: "اطلاعات کاربر", align: "right" });

  if (customer) {
    lines.push({
      text: `نام خانوادگی: ${customer.lastName || ""}`,
      align: "right",
    });
    lines.push({
      text: `موبایل: ${customer.mobile || ""}`,
      align: "right",
    });
  }

  lines.push({ text: "===========================", align: "right" });
  lines.push({ text: "اطلاعات سفارش", align: "right" });

  if (userOrder) {
    lines.push({
      text: `تاریخ: ${toPersianDate(userOrder.createdAt) || ""}`,
      align: "right",
    });
    lines.push({
      text: `قیمت: ${userOrder.price?.toLocaleString()} تومان`,
      align: "right",
    });

    lines.push({ text: "===========================", align: "right" });

    if (userOrder.list?.length) {
      lines.push({ text: "لیست بازی‌ها:", align: "right" });
      userOrder.list.forEach((game) => {
        lines.push({ text: game, align: "left" });
      });
    }

    lines.push({ text: "===========================", align: "right" });
    lines.push({
      text: `توضیحات: ${userOrder.description || ""}`,
      align: "right",
    });
  }

  lines.forEach(({ text, align }) => {
    const font = isEnglish(text) ? "Helvetica" : "BNAZANB";
    doc.setFont(font, "normal");
    doc.text(text, align === "right" ? 75 : 5, currentY, { align });
    currentY += lineHeight;
  });

  return doc.output("blob");
};

export const sendPdfToBackend = async (
  userOrder: storeOrder | null,
  customer: Customer | null
) => {
  try {
    const pdfBlob = generatePDF(userOrder, customer);

    const formData = new FormData();
    formData.append("file", pdfBlob, "ticket.pdf");

    const res = await fetch("/api/admin/store-order/print", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      toast.success("فایل برای چاپ ارسال شد.");
    } else {
      toast.error("خطا در ارسال فایل.");
    }
  } catch (err) {
    console.error(err);
    toast.error("ارسال با خطا مواجه شد.");
  }
};

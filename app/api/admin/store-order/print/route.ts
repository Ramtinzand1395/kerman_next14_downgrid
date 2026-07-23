// // import { NextResponse } from "next/server";
// // import { getServerSession } from "next-auth";
// //  import { authOptions } from "@/app/api/auth/[...nextauth]/options";
// // const PRINTNODE_BASE = "https://api.printnode.com";

// // const getAuthHeader = () => {
// //   const apiKey = process.env.printernode;
// //   if (!apiKey) throw new Error("API_KEY تعریف نشده");

// //   return {
// //     Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
// //   };
// // };

// // /* ===================== POST : Print PDF ===================== */
// // export async function POST(req: Request) {
// //     const session = await getServerSession(authOptions);
// //  if (!session?.user)
// //    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
// //  if (!["admin", "superadmin"].includes(session.user.role))
// //    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

// //   try {
// //     const formData = await req.formData();
// //     const file = formData.get("file") as File | null;

// //     if (!file) {
// //       return NextResponse.json(
// //         { error: "فایل ارسال نشده" },
// //         { status: 400 }
// //       );
// //     }

// //     // File → base64
// //     const buffer = Buffer.from(await file.arrayBuffer());
// //     const base64Content = buffer.toString("base64");

// //     const res = await fetch(`${PRINTNODE_BASE}/printjobs`, {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         ...getAuthHeader(),
// //       },
// //       body: JSON.stringify({
// //         printerId: 75151896,
// //         title: "Ticket Print",
// //         contentType: "pdf_base64",
// //         content: base64Content,
// //       }),
// //     });

// //     if (!res.ok) {
// //       const errText = await res.text();
// //       throw new Error(errText);
// //     }

// //     const data = await res.json();

// //     return NextResponse.json({
// //       success: true,
// //       data,
// //     });
// //   } catch (err: any) {
// //     console.error("Print Error:", err.message);

// //     return NextResponse.json(
// //       {
// //         error: "خطا در ارسال فایل PDF",
// //         details: err.message,
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }

// // // todo
// // // این کامتن پاک نشه برای دریافت پرینتر ها برو به ادرس
// // // http://localhost:3000/api/admin/store-order/print

// // export const runtime = "nodejs";

// // const getAuthHeader2 = () => {
// //   const apiKey = process.env.printernode;
// //   if (!apiKey) throw new Error("PRINTNODE_API_KEY (یا printernode) تعریف نشده");

// //   return {
// //     Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
// //   };
// // };

// // export async function GET() {
// //   try {
// //     const res = await fetch(`${PRINTNODE_BASE}/printers`, {
// //       method: "GET",
// //       headers: { ...getAuthHeader2() },
// //       cache: "no-store",
// //     });

// //     const raw = await res.text();

// //     if (!res.ok) {
// //       return NextResponse.json(
// //         { success: false, error: "خطا از PrintNode", details: raw },
// //         { status: res.status }
// //       );
// //     }

// //     return NextResponse.json({ success: true, printers: JSON.parse(raw) });
// //   } catch (err: any) {
// //     // مهم: علت دقیق خطا (DNS / TLS / Timeout / ...)
// //     const cause = err?.cause
// //       ? {
// //           name: err.cause.name,
// //           code: err.cause.code,
// //           message: err.cause.message,
// //           errno: err.cause.errno,
// //           syscall: err.cause.syscall,
// //           address: err.cause.address,
// //           port: err.cause.port,
// //         }
// //       : null;

// //     return NextResponse.json(
// //       {
// //         success: false,
// //         error: "خطا در گرفتن لیست پرینترها",
// //         details: err?.message || String(err),
// //         cause,
// //       },
// //       { status: 500 }
// //     );
// //   }
// // }

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// // هدر احراز هویت اختصاصی برای اپلیکیشن ویندوزی جهت امنیت بیشتر
// const WINDOWS_APP_API_KEY =
//   process.env.WINDOWS_APP_API_KEY || "YOUR_SECURE_TOKEN_HERE";

// export const runtime = "nodejs";

// /* ==========================================================================
//    ۱. متد GET: مخصوص اپلیکیشن ویندوزی (هر ۱ ثانیه به این آدرس درخواست می‌فرستد)
//    ========================================================================== */
// export async function GET(req: Request) {
//   try {
//     // امنیت: بررسی توکن اپلیکیشن ویندوزی برای جلوگیری از دسترسی دیگران
//     // const authHeader = req.headers.get("Authorization");
//     // if (!authHeader || authHeader !== `Bearer ${WINDOWS_APP_API_KEY}`) {
//     //   return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
//     // }

//     /* 
//       TODO: در این بخش باید به سراغ دیتابیس یا کش (مانند Redis / PostgreSQL / Prisma) بروید 
//       و اولین رکورد ثبت شده که وضعیت آن هنوز "پست نشده/ارسال‌نشده" (status: 'pending') است را پیدا کنید.
      
//       به عنوان مثال با Prisma:
//       const pendingJob = await prisma.printQueue.findFirst({
//          where: { status: "pending" },
//          orderBy: { createdAt: "asc" }
//       });
//     */

//     // نمونه دیتای شبیه‌سازی شده برای تست (این بخش را با دیتابیس خود جایگزین کنید)
//     const pendingJob = {
//       id: "job_12345",
//       receiptType: "ps5_copy",
//       fullName: "ramtin",
//       mobile: "091384458",
//       date: "2026-07-22T19:30:00",
//       games: [
//         { name: "محصول ۱", qty: 2, price: 150000 },
//         { name: "محصول ۲", qty: 1, price: 90000 },
//       ],
//       price: 1850000,
//       totalSizeGB: 385,
//       customerDescription: "اکانت ظرفیت ۲",
//     };

//     // if (!pendingJob) {
//     //   // اگر دیتای جدیدی در صف نبود، وضعیت ۲-۴ (No Content) یا یک پیام ساده بفرستید
//     //   return NextResponse.json(
//     //     { message: "دیتای جدیدی وجود ندارد" },
//     //     { status: 200 },
//     //   );
//     // }

//     /*
//       مهم: پس از اینکه دیتا را تحویل اپلیکیشن ویندوزی دادید، باید وضعیت آن را به 
//       "در حال پردازش" (processing) یا "ارسال شده" (sent) تغییر دهید تا در درخواست ثانیه بعدی، 
//       مجدداً همین دیتا ارسال نشود و تداخل ایجاد نکند.
      
//       مثال با Prisma:
//       await prisma.printQueue.update({
//          where: { id: pendingJob.id },
//          data: { status: "sent" }
//       });
//     */

//     return NextResponse.json({
//       success: true,
//       jobId: pendingJob.id,
//       payload: pendingJob,
//     });
//   } catch (err: any) {
//     console.error("GET Pending Job Error:", err.message);
//     return NextResponse.json(
//       { error: "خطا در بررسی صف درخواست‌ها", details: err.message },
//       { status: 500 },
//     );
//   }
// }

// /* ==========================================================================
//    ۲. متد POST: ثبت دیتای جدید در صف (توسط پنل مدیریت سایت یا وب‌سایت)
//    ========================================================================== */
// export async function POST(req: Request) {
//   // امنیت: فقط کاربران لاگین شده با نقش ادمین بتوانند کارهای جدید ثبت کنند
//   const session = await getServerSession(authOptions);
//   if (!session?.user) {
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//   }
//   if (!["admin", "superadmin"].includes(session.user.role)) {
//     return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
//   }

//   try {
//     const body = await req.json(); // دریافت بدنه جیسون ارسالی از وب‌سایت

//     if (!body || Object.keys(body).length === 0) {
//       return NextResponse.json(
//         { error: "اطلاعات جیسون ارسال نشده است" },
//         { status: 400 },
//       );
//     }

//     /*
//       TODO: در این بخش دیتای جدید را در دیتابیس ذخیره کنید تا وضعیت آن روی 'pending' قرار گیرد.
      
//       مثال با Prisma:
//       const newJob = await prisma.printQueue.create({
//          data: {
//            status: "pending",
//            data: body // ذخیره به عنوان JSON
//          }
//       });
//     */

//     return NextResponse.json({
//       success: true,
//       message:
//         "دیتا با موفقیت به صف پردازش اضافه شد و آماده تحویل به ویندوز است.",
//       // data: newJob
//     });
//   } catch (err: any) {
//     console.error("Add Job Error:", err.message);
//     return NextResponse.json(
//       { error: "خطا در اضافه کردن دیتا به صف", details: err.message },
//       { status: 500 },
//     );
//   }
// }

// /app/api/admin/store-order/print/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export const runtime = "nodejs";

// یک صف موقت در حافظه (در صورت نداشتن دیتابیس). 
// برای محیط پروداکشن بهتر است از دیتابیس (MongoDB/Prisma) استفاده کنید.
let globalPrintQueue: any[] = [];

/* ==========================================================================
   ۱. متد GET: مخصوص اپلیکیشن ویندوزی (هر ۱ ثانیه به این آدرس درخواست می‌فرستد)
   ========================================================================== */
export async function GET(req: Request) {
  try {
    // پیدا کردن اولین کار در وضعیت pending
    const pendingJob = globalPrintQueue.find(job => job.status === "pending");

    if (!pendingJob) {
      return NextResponse.json(
        { message: "دیتای جدیدی وجود ندارد", jobExists: false },
        { status: 200 }
      );
    }

    // تغییر وضعیت کار به sent تا در درخواست بعدی مجدداً فرستاده نشود
    pendingJob.status = "sent";
    
    // تمیز کردن صف از کارهای قدیمی فرستاده شده (اختیاری)
    globalPrintQueue = globalPrintQueue.filter(job => job.status === "pending");

    return NextResponse.json({
      success: true,
      jobId: pendingJob.id,
      payload: pendingJob.payload,
    });
  } catch (err: any) {
    console.error("GET Pending Job Error:", err.message);
    return NextResponse.json(
      { error: "خطا در بررسی صف درخواست‌ها", details: err.message },
      { status: 500 }
    );
  }
}

/* ==========================================================================
   ۲. متد POST: ثبت دیتای جدید در صف (توسط دکمه پرینت در پنل مدیریت)
   ========================================================================== */
export async function POST(req: Request) {
  // امنیت: فقط کاربران لاگین شده با نقش ادمین
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await req.json(); // دریافت مستقیم دیتای ساختاریافته سفارش

    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "اطلاعات سفارش ارسال نشده است" },
        { status: 400 }
      );
    }

    // ایجاد یک رکورد جدید برای صف
    const newJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      status: "pending",
      payload: body,
      createdAt: new Date(),
    };

    // اضافه کردن به صف
    globalPrintQueue.push(newJob);

    return NextResponse.json({
      success: true,
      message: "سفارش با موفقیت به صف پرینتر ویندوز اضافه شد.",
      jobId: newJob.id
    });
  } catch (err: any) {
    console.error("Add Job Error:", err.message);
    return NextResponse.json(
      { error: "خطا در اضافه کردن سفارش به صف چاپ", details: err.message },
      { status: 500 }
    );
  }
}

// // /app/api/admin/store-order/print/route.ts

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// export const runtime = "nodejs";

// // یک صف موقت در حافظه (در صورت نداشتن دیتابیس).
// // برای محیط پروداکشن بهتر است از دیتابیس (MongoDB/Prisma) استفاده کنید.
// let globalPrintQueue: any[] = [];

// /* ==========================================================================
//    ۱. متد GET: مخصوص اپلیکیشن ویندوزی (هر ۱ ثانیه به این آدرس درخواست می‌فرستد)
//    ========================================================================== */
// export async function GET(req: Request) {
//   try {
//     // پیدا کردن اولین کار در وضعیت pending
//     const pendingJob = globalPrintQueue.find((job) => job.status === "pending");

//     if (!pendingJob) {
//       return NextResponse.json(
//         { message: "دیتای جدیدی وجود ندارد", jobExists: false },
//         { status: 200 },
//       );
//     }

//     // تغییر وضعیت کار به sent تا در درخواست بعدی مجدداً فرستاده نشود
//     pendingJob.status = "sent";

//     // تمیز کردن صف از کارهای قدیمی فرستاده شده (اختیاری)
//     globalPrintQueue = globalPrintQueue.filter(
//       (job) => job.status === "pending",
//     );

//     return NextResponse.json({
//       success: true,
//       jobId: pendingJob.id,
//       payload: pendingJob.payload,
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
//    ۲. متد POST: ثبت دیتای جدید در صف (توسط دکمه پرینت در پنل مدیریت)
//    ========================================================================== */
// export async function POST(req: Request) {
//   // امنیت: فقط کاربران لاگین شده با نقش ادمین
//   const session = await getServerSession(authOptions);
//   if (!session?.user) {
//     return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
//   }
//   if (!["admin", "superadmin"].includes(session.user.role)) {
//     return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
//   }

//   try {
//     const body = await req.json(); // دریافت مستقیم دیتای ساختاریافته سفارش

//     if (!body || Object.keys(body).length === 0) {
//       return NextResponse.json(
//         { error: "اطلاعات سفارش ارسال نشده است" },
//         { status: 400 },
//       );
//     }

//     // ایجاد یک رکورد جدید برای صف
//     const newJob = {
//       id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
//       status: "pending",
//       payload: body,
//       createdAt: new Date(),
//     };

//     // اضافه کردن به صف
//     globalPrintQueue.push(newJob);

//     return NextResponse.json({
//       success: true,
//       message: "سفارش با موفقیت به صف پرینتر ویندوز اضافه شد.",
//       jobId: newJob.id,
//     });
//   } catch (err: any) {
//     console.error("Add Job Error:", err.message);
//     return NextResponse.json(
//       { error: "خطا در اضافه کردن سفارش به صف چاپ", details: err.message },
//       { status: 500 },
//     );
//   }
// }

// /app/api/admin/store-order/print/route.ts

// import { NextResponse } from "next/server";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// export const runtime = "nodejs";

// // صف در حافظه (در محیط Vercel این متغیر با هر بار ریست شدن Serverless Function پاک می‌شود.
// // اگر حجم سفارشات بالاست، بهتر است از Redis استفاده کنید)
// let globalPrintQueue: any[] = [];

// // متد GET: نرم‌افزار ویندوزی دیتا را می‌گیرد
// export async function GET() {
//   try {
//     // فقط کارهایی که هنوز فرستاده نشده‌اند (pending)
//     const pendingJob = globalPrintQueue.find((job) => job.status === "pending");

//     if (!pendingJob) {
//       return NextResponse.json(
//         { message: "No jobs", jobExists: false },
//         { status: 200 },
//       );
//     }

//     // وضعیت را به "در حال چاپ" تغییر می‌دهیم اما پاک نمی‌کنیم
//     pendingJob.status = "sent";

//     return NextResponse.json({
//       success: true,
//       jobId: pendingJob.id,
//       payload: pendingJob.payload,
//     });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // متد POST: پنل مدیریت دیتای جدید اضافه می‌کند
// export async function POST(req: Request) {
//   const session = await getServerSession(authOptions);
//   if (!["admin", "superadmin"].includes(session?.user?.role ?? "")) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
//   }
//   try {
//     const body = await req.json();
//     const newJob = {
//       id: `job_${Date.now()}`, // ایجاد ID منحصر به فرد
//       status: "pending",
//       payload: body,
//     };

//     globalPrintQueue.push(newJob);

//     return NextResponse.json({ success: true, jobId: newJob.id });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // برای اینکه بتوانیم از فایل‌های دیگر به این لیست دسترسی داشته باشیم (برای حذف)
// export { globalPrintQueue };

// /app/api/admin/store-order/print/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export const runtime = "nodejs";

export interface PrintJob {
  id: string;
  status: "pending" | "sent";
  payload: Record<string, any>;
}

// صف در حافظه (در صورت نیاز به تداوم در Vercel می‌توانید بعداً Redis را جایگزین کنید)
export let globalPrintQueue: PrintJob[] = [];

// متد GET: برنامه ویندوزی هر ۱ ثانیه‌ یک‌بار به اینجا درخواست می‌زند
export async function GET() {
  try {
    const pendingJob = globalPrintQueue.find((job) => job.status === "pending");

    if (!pendingJob) {
      return NextResponse.json(
        {
          success: true,
          jobExists: false,
          payload: null,
        },
        { status: 200 }
      );
    }

    // تغییر وضعیت به sent جهت جلوگیری از تحویل تکراری قبل از چاپ
    pendingJob.status = "sent";

    return NextResponse.json({
      success: true,
      jobExists: true,
      payload: {
        id: pendingJob.id,
        ...pendingJob.payload,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// متد POST: ثبت جاب جدید از طریق پنل مدیریت
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!["admin", "superadmin"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // ساخت یک ID منحصر به‌فرد همراه با زمان و کاراکتر تصادفی
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newJob: PrintJob = {
      id: jobId,
      status: "pending",
      payload: body,
    };

    globalPrintQueue.push(newJob);

    return NextResponse.json({
      success: true,
      payload: {
        id: jobId,
        ...body,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// /app/api/admin/store-order/print/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { globalPrintQueue, type PrintJob } from "@/lib/printQueue";

export const runtime = "nodejs";

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

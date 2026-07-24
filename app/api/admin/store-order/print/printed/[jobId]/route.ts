// // /app/api/admin/store-order/printed/[jobId]/route.ts

// import { NextResponse } from "next/server";
// import { globalPrintQueue } from "../../route"; // ایمپورت کردن صف از فایل قبلی

// export async function GET(
//   req: Request,
//   { params }: { params: { jobId: string } }
// ) {
//   try {
//     const jobId = params.jobId;

//     // پیدا کردن ایندکس آیتم در آرایه
//     const jobIndex = globalPrintQueue.findIndex((job) => job.id === jobId);

//     if (jobIndex !== -1) {
//       // حذف آیتم از صف برای همیشه
//       globalPrintQueue.splice(jobIndex, 1);
      
//       console.log(`Job ${jobId} removed from queue successfully.`);
      
//       return NextResponse.json({
//         success: true,
//         message: "کار با موفقیت از صف حذف شد.",
//       });
//     }

//     return NextResponse.json(
//       { success: false, message: "Job not found" },
//       { status: 404 }
//     );
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// /app/api/admin/store-order/printed/[jobId]/route.ts

import { NextResponse } from "next/server";
import { globalPrintQueue } from "../../route";

async function handleJobRemoval(jobId: string) {
  const jobIndex = globalPrintQueue.findIndex((job) => job.id === jobId);

  if (jobIndex !== -1) {
    // حذف آیتم از صف
    globalPrintQueue.splice(jobIndex, 1);

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} with success deleted from queue.`,
    });
  }

  return NextResponse.json(
    { success: false, message: "Job not found or already deleted." },
    { status: 404 }
  );
}

// پشتیبانی از متد DELETE (روش اصلی برای ویندوز)
export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    return await handleJobRemoval(params.jobId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// پشتیبانی از متد GET (جهت تست آسان‌تر در مرورگر)
export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    return await handleJobRemoval(params.jobId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

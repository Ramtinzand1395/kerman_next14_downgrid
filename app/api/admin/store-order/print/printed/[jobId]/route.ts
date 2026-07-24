// /app/api/admin/store-order/printed/[jobId]/route.ts

import { NextResponse } from "next/server";
import { globalPrintQueue } from "@/lib/printQueue";

async function handleJobRemoval(jobId: string) {
  const jobIndex = globalPrintQueue.findIndex((job) => job.id === jobId);

  if (jobIndex !== -1) {
    // حذف آیتم از صف مشترک
    globalPrintQueue.splice(jobIndex, 1);

    return NextResponse.json({
      success: true,
      message: `Job ${jobId} deleted from queue successfully.`,
    });
  }

  return NextResponse.json(
    { success: false, message: "Job not found or already deleted." },
    { status: 404 }
  );
}

// متد DELETE
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

// متد GET جهت تست آسان در مرورگر
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

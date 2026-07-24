import { NextResponse } from "next/server";
import { globalPrintQueue } from "@/lib/printQueue";

async function removeJob(jobId: string) {
  const index = globalPrintQueue.findIndex((job) => job.id === jobId);

  if (index === -1) {
    return NextResponse.json(
      { success: false, message: "Job not found" },
      { status: 404 }
    );
  }

  globalPrintQueue.splice(index, 1);

  return NextResponse.json({
    success: true,
    message: "Job deleted successfully",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    return await removeJob(params.jobId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    return await removeJob(params.jobId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

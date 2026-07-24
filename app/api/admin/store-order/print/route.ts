import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { globalPrintQueue, type PrintJob } from "@/lib/printQueue";

export const runtime = "nodejs";

export async function GET() {
  try {
    const job = globalPrintQueue[0];

    if (!job) {
      return NextResponse.json({
        success: true,
        jobExists: false,
        payload: null,
      });
    }

    return NextResponse.json({
      success: true,
      jobExists: true,
      payload: {
        id: job.id,
        ...job.payload,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!["admin", "superadmin"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const newJob: PrintJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      payload: body,
    };

    globalPrintQueue.push(newJob);

    return NextResponse.json({
      success: true,
      payload: {
        id: newJob.id,
        ...body,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

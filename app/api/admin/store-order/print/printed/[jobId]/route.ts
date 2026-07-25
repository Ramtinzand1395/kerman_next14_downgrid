// app/api/admin/store-order/print/printed/[jobId]/route.ts

import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { jobId: string } },
) {
  try {
    await dbConnect();

    const job = await PrintQueue.findByIdAndDelete(params.jobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Print job not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Print job removed successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 },
    );
  }
}

// app/api/admin/store-order/print/printed/[jobId]/route.ts

import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import mongoose from "mongoose";

export async function DELETE(
  req: Request,
  { params }: { params: { jobId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }
    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    if (!mongoose.isValidObjectId(params.jobId)) {
      return NextResponse.json(
        { success: false, error: "شناسه کار چاپ نامعتبر است" },
        { status: 400 },
      );
    }

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

import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    const job = await PrintQueue.findOne({
      status: "pending",
    }).sort({ createdAt: 1 });

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
        id: job._id,
        ...job.payload,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();

    const job = await PrintQueue.create({
      payload: body,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      payload: {
        id: job._id,
        ...job.payload,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

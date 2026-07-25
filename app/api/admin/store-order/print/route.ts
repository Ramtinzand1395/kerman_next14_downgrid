import dbConnect from "@/lib/mongodb";
import PrintQueue from "@/model/PrintQueue";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    const job = await PrintQueue.find();

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
      payload: job,
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
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import dbConnect from "@/lib/mongodb";
import TempPayment from "@/model/TempPayment";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await dbConnect();

  const token = req.headers.get("x-cron-token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await TempPayment.updateMany(
    {
      status: { $in: ["initiated", "paid_pending"] },
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "refund_required",
      },
    },
  );

  console.info(
    JSON.stringify({
      event: "payment.cleanup.expired",
      matched: result.matchedCount,
      modified: result.modifiedCount,
    }),
  );

  return NextResponse.json({
    success: true,
    matched: result.matchedCount,
    modified: result.modifiedCount,
  });
}

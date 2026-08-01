// app/api/loyalty/cron/expire-credits/route.ts
// کران‌جاب روزانه: منقضی کردن اعتبارهای کیف پولی که تاریخ انقضایشان گذشته است.
// فراخوانی: POST با هدر x-cron-token برابر CRON_SECRET (مشابه cleanup-pending)
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { expireCredits } from "@/lib/loyalty/wallet.service";

export async function POST(req: NextRequest) {
  await dbConnect();

  const token = req.headers.get("x-cron-token");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await expireCredits(new Date());

  console.info(
    JSON.stringify({
      event: "loyalty.wallet.expireCredits",
      ...result,
    }),
  );

  return NextResponse.json({ success: true, ...result });
}

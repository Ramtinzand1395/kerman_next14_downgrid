import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redeemPointsForOrder } from "@/lib/loyalty";

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    points?: number;
    orderId?: string;
  } | null;

  const points = Number(body?.points || 0);
  const orderId = String(body?.orderId || "").trim();

  if (!orderId) {
    return NextResponse.json(
      { ok: false, message: "برای خرج امتیاز باید شناسه سفارش ارسال شود." },
      { status: 400 },
    );
  }

  const result = await redeemPointsForOrder({
    userId: session.user.id,
    orderId,
    requestedPoints: points,
  });

  return NextResponse.json({ ok: true, data: result });
}

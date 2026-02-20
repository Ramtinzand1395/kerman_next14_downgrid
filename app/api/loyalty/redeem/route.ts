import { NextResponse } from "next/server";
import { redeemPointsForOrder } from "@/lib/loyalty";
import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user;
    await dbConnect();

    const body = (await req.json().catch(() => null)) as {
      orderId?: string;
      points?: number;
    } | null;
    const orderId = String(body?.orderId || "");
    const points = Number(body?.points || 0);

    if (!orderId)
      return NextResponse.json(
        { ok: false, error: "MISSING_ORDER_ID" },
        { status: 400 },
      );

    const result = await redeemPointsForOrder({
      userId,
      orderId,
      requestedPoints: points,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    const status =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

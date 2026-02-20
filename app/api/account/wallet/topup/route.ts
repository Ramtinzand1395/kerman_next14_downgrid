import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, data: { balance: 0, transactions: [] } });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { amount?: number } | null;
  const amount = Number(body?.amount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ ok: false, message: "INVALID_AMOUNT" }, { status: 400 });
  }

  return NextResponse.json({
    ok: false,
    message: "شارژ کیف پول هنوز پیاده‌سازی نشده است.",
  });
}

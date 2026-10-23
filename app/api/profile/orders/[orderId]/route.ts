import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { getOrderForViewer } from "@/lib/orderAccess";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET(
  _request: Request,
  { params }: { params: { orderId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "برای مشاهده سفارش وارد حساب شوید." },
      { status: 401, headers: privateHeaders },
    );
  }

  await dbConnect();
  const order = await getOrderForViewer({
    orderId: params.orderId,
    userId: session.user.id,
    role: session.user.role,
  });

  if (!order) {
    return NextResponse.json(
      { error: "سفارش پیدا نشد یا اجازه مشاهده آن را ندارید." },
      { status: 404, headers: privateHeaders },
    );
  }

  return NextResponse.json(order, { headers: privateHeaders });
}

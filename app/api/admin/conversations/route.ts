import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { listConversations } from "@/lib/notifications/conversations";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }
  return NextResponse.json(await listConversations(
    { id: session.user.id, role: session.user.role },
    {
      page: Number(req.nextUrl.searchParams.get("page") || 1),
      limit: Number(req.nextUrl.searchParams.get("limit") || 15),
      status: req.nextUrl.searchParams.get("status") || undefined,
      search: req.nextUrl.searchParams.get("q") || undefined,
    },
  ));
}

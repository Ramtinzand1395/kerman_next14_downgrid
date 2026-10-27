// app/api/admin/notifications/unread/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/notifications/service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const unreadCount = await getUnreadCount(session.user.id, "ADMIN");

  return NextResponse.json(unreadCount);
}

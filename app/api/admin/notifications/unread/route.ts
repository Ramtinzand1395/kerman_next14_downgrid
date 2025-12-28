// app/api/admin/notifications/unread/route.ts
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await dbConnect();

  const unreadCount = await Notification.countDocuments({
    for: "admin",
    isRead: false,
  });

  return NextResponse.json(unreadCount);
}

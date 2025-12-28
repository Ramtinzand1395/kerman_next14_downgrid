import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Comment from "@/model/Comment";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await dbConnect();
  const body = await req.json();

  const comment = await Comment.findByIdAndUpdate(
    body.id,
    { verified: true },
    { new: true }
  );

  // نوتیفیکیشن مربوطه رو خوانده شده کن
  await Notification.updateMany(
    { type: "comment", product: comment?.product },
    { isRead: true }
  );

  return NextResponse.json({ success: true, comment });
}

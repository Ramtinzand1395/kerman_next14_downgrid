import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id)
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 },
      );

    await dbConnect();

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
     { returnDocument: 'after' },
    );

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

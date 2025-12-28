import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });

    await dbConnect();

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Notification marked as read", notification });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

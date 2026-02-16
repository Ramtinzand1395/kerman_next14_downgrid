import dbConnect from "@/lib/mongodb";
import ContactMessage from "@/model/ContactMessage";
import Notification from "@/model/Notification";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, subject, message } = body ?? {};

    if (!name || !email || !phone || !subject || !message) {
      return NextResponse.json({ error: "اطلاعات فرم ناقص است." }, { status: 400 });
    }

    await dbConnect();

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    await Notification.create({
      title: `پیام جدید تماس: ${subject}`,
      message: `از طرف ${name} | ${phone}`,
      type: "contact",
      target: {
        kind: "ContactMessage",
        item: contactMessage._id,
      },
      for: "admin",
      isRead: false,
    });

    return NextResponse.json({ success: true, message: "پیام شما ثبت شد." }, { status: 201 });
  } catch (error) {
    console.error("Contact message submit error:", error);
    return NextResponse.json({ error: "خطا در ثبت پیام" }, { status: 500 });
  }
}

import dbConnect from "@/lib/mongodb";
import ContactMessage from "@/model/ContactMessage";
import { notifyAdmins } from "@/lib/notifications/service";
import { contactMessageSchema } from "@/validations/contactValidation";
import { NextResponse } from "next/server";

const MAX_REQUEST_SIZE = 16 * 1024;

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "حجم درخواست بیش از حد مجاز است." },
        { status: 413 },
      );
    }

    const rawBody = await req.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: "حجم درخواست بیش از حد مجاز است." },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "بدنه درخواست معتبر نیست." }, { status: 400 });
    }

    const validationResult = contactMessageSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: validationResult.error.issues[0]?.message ?? "اطلاعات فرم معتبر نیست.",
        },
        { status: 400 },
      );
    }

    const { name, email, phone, subject, message } = validationResult.data;

    await dbConnect();

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
    });

    await notifyAdmins({
      title: `پیام جدید تماس: ${subject}`,
      message: `از طرف ${name} | ${phone}`,
      type: "SUPPORT_MESSAGE",
      category: "support",
      entityType: "ContactMessage",
      entityId: contactMessage._id,
      link: "/dashboard/notifications",
      priority: "high",
      eventKey: `SUPPORT_MESSAGE:${contactMessage._id}`,
    }).catch((error) => console.error("[notifications] support event failed:", error));

    return NextResponse.json({ success: true, message: "پیام شما ثبت شد." }, { status: 201 });
  } catch (error) {
    console.error("Contact message submit error:", error);
    return NextResponse.json({ error: "خطا در ثبت پیام" }, { status: 500 });
  }
}

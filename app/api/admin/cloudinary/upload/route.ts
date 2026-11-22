import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { uploadCloudinaryImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "فایل تصویر ارسال نشده است" }, { status: 400 });
    }

    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "فرمت تصویر مجاز نیست. تصویر JPG، PNG، WebP، GIF یا AVIF انتخاب کنید." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "فایل تصویر خالی یا خراب است؛ تصویر سالم دیگری انتخاب کنید." }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد" },
        { status: 413 },
      );
    }

    const uploaded = await uploadCloudinaryImage(
      Buffer.from(await file.arrayBuffer()),
    );

    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json(
      { error:
          error instanceof Error && error.message.includes("credentials are missing")
            ? "تنظیمات سرویس آپلود تصویر روی سرور ناقص است. با پشتیبانی فنی تماس بگیرید."
            : "سرویس بارگذاری تصویر در حال حاضر پاسخ نداد. اتصال سرور و تنظیمات Cloudinary را بررسی کنید."
      },
      { status: 500 },
    );
  }
}

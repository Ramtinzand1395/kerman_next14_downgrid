import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { uploadCloudinaryImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "فقط فایل تصویری مجاز است" }, { status: 400 });
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
      { error: "آپلود تصویر در Cloudinary ناموفق بود" },
      { status: 500 },
    );
  }
}

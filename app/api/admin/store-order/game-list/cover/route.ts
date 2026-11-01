import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { uploadGameCover } from "@/lib/game-cloudinary";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ message: "دسترسی غیرمجاز" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length")) > MAX_BYTES + 65536) {
    return NextResponse.json({ message: "حداکثر حجم تصویر ۵ مگابایت است" }, { status: 413 });
  }
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || !file.size) {
      return NextResponse.json({ message: "فایل JPG، PNG، WebP یا AVIF انتخاب کنید" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "حداکثر حجم تصویر ۵ مگابایت است" }, { status: 413 });
    }
    return NextResponse.json(await uploadGameCover(Buffer.from(await file.arrayBuffer())), { status: 201 });
  } catch (error) {
    const unconfigured = error instanceof Error && error.message === "GAME_CLOUDINARY_NOT_CONFIGURED";
    console.error("Game cover upload failed", unconfigured ? "missing game Cloudinary configuration" : "upload error");
    return NextResponse.json({ message: unconfigured ? "آپلود کاور بازی هنوز روی سرور تنظیم نشده است؛ فعلاً آدرس تصویر را وارد کنید" : "آپلود کاور ناموفق بود؛ دوباره تلاش کنید" }, { status: unconfigured ? 503 : 502 });
  }
}

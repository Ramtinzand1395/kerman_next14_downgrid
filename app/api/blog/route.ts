import { NextRequest, NextResponse } from "next/server";
import { getPublishedBlogs } from "@/services/blog/getPublishedBlogs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get("limit") || "9");
    const blogs = await getPublishedBlogs(Number.isNaN(limit) ? 9 : limit);
    return NextResponse.json(blogs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در دریافت وبلاگ‌ها" }, { status: 500 });
  }
}

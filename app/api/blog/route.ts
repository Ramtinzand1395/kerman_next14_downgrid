import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const limit = Number(req.nextUrl.searchParams.get("limit") || "9");

    const blogs = await Blog.find({ published: true })
      .sort({ createdAt: -1 })
      .limit(Number.isNaN(limit) ? 9 : limit)
      .lean();

    return NextResponse.json(blogs);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در دریافت وبلاگ‌ها" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { buildBlogPayload } from "@/lib/blogPayload";

export async function GET() {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const blogs = await Blog.find().sort({ updatedAt: -1 }).lean();
    return NextResponse.json(blogs);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "خطا در دریافت وبلاگ‌ها" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const { error, payload, seoIssues } = buildBlogPayload(body);
    if (error) {
      return NextResponse.json({ error, seoIssues }, { status: 400 });
    }

    const slugExists = await Blog.findOne({ slug: payload.slug });
    if (slugExists) {
      return NextResponse.json(
        { error: "این اسلاگ قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    const blog = await Blog.create(payload);

    return NextResponse.json(blog, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در ایجاد وبلاگ" }, { status: 500 });
  }
}

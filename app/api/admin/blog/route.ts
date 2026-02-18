import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-");

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

    const body = await req.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: "عنوان و محتوای وبلاگ الزامی است" },
        { status: 400 },
      );
    }

    const slugBase = slugify(body.slug || title);
    if (!slugBase) {
      return NextResponse.json({ error: "اسلاگ نامعتبر است" }, { status: 400 });
    }

    const slugExists = await Blog.findOne({ slug: slugBase });
    if (slugExists) {
      return NextResponse.json(
        { error: "این اسلاگ قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    const blog = await Blog.create({
      title,
      slug: slugBase,
      excerpt: String(body.excerpt || "").trim(),
      content,
      coverImage: String(body.coverImage || "").trim(),
      published: Boolean(body.published),
    });

    return NextResponse.json(blog, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در ایجاد وبلاگ" }, { status: 500 });
  }
}

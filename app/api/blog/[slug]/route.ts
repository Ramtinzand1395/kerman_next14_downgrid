import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();
    const { slug } = await params;

    const blog = await Blog.findOne({ slug, published: true }).lean();

    if (!blog) {
      return NextResponse.json({ error: "مقاله پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json(blog);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در دریافت مقاله" }, { status: 500 });
  }
}

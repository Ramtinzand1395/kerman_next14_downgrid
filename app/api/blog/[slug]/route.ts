import { NextResponse } from "next/server";
import { getBlogBySlug } from "@/services/blog/getBlogBySlug";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const blog = await getBlogBySlug(slug);

    if (!blog) {
      return NextResponse.json({ error: "مقاله پیدا نشد" }, { status: 404 });
    }

    return NextResponse.json(blog);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در دریافت مقاله" }, { status: 500 });
  }
}

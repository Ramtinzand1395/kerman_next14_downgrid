import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { deleteUnusedCloudinaryImages } from "@/lib/cloudinary";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-");
    
const parseFocusKeywords = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};
const authorize = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  return null;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const authError = await authorize();
    if (authError) return authError;

    const { id } = await params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
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

    const slug = slugify(body.slug || title);
    if (!slug) {
      return NextResponse.json({ error: "اسلاگ نامعتبر است" }, { status: 400 });
    }

    const duplicate = await Blog.findOne({ slug, _id: { $ne: id } });
    if (duplicate) {
      return NextResponse.json(
        { error: "این اسلاگ قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return NextResponse.json({ error: "وبلاگ یافت نشد" }, { status: 404 });
    }

    const updateData = {
      title,
      slug,
      excerpt: String(body.excerpt || "").trim(),
      content,
      coverImage: String(body.coverImage || "").trim(),
      published: Boolean(body.published),
      metaDescription: String(body.metaDescription || "").trim(),
      focusKeyword: parseFocusKeywords(body.focusKeyword),
    };

    // Validate the new database state before permanently deleting the old asset.
    const validationCandidate = new Blog({
      ...existingBlog.toObject(),
      ...updateData,
      _id: id,
    });
    await validationCandidate.validate();

    if (
      existingBlog.coverImage &&
      existingBlog.coverImage !== updateData.coverImage
    ) {
      await deleteUnusedCloudinaryImages([existingBlog.coverImage], {
        excludeBlogId: id,
      });
    }

    const updated = await Blog.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
    });

    if (!updated) {
      return NextResponse.json({ error: "وبلاگ یافت نشد" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در ویرایش وبلاگ" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const authError = await authorize();
    if (authError) return authError;

    const { id } = await params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }

    const blog = await Blog.findById(id).select("_id coverImage").lean();
    if (!blog) {
      return NextResponse.json({ error: "وبلاگ یافت نشد" }, { status: 404 });
    }

    await deleteUnusedCloudinaryImages([blog.coverImage], {
      excludeBlogId: id,
    });
    await Blog.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در حذف وبلاگ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Blog from "@/model/Blog";
import { deleteUnusedCloudinaryImages } from "@/lib/cloudinary";
import { buildBlogPayload } from "@/lib/blogPayload";
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

    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return NextResponse.json({ error: "وبلاگ یافت نشد" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const { error, payload: updateData, seoIssues } = buildBlogPayload(
      body,
      existingBlog.publishedAt,
    );
    if (error) {
      return NextResponse.json({ error, seoIssues }, { status: 400 });
    }

    const duplicate = await Blog.findOne({
      slug: updateData.slug,
      _id: { $ne: id },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: "این نشانی قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    // Validate the complete document before writing the update.
    const validationCandidate = new Blog({
      ...existingBlog.toObject(),
      ...updateData,
      _id: id,
    });
    await validationCandidate.validate();

    const updated = await Blog.findByIdAndUpdate(id, updateData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "وبلاگ یافت نشد" }, { status: 404 });
    }

    if (
      existingBlog.coverImage &&
      existingBlog.coverImage !== updateData.coverImage
    ) {
      try {
        await deleteUnusedCloudinaryImages([existingBlog.coverImage], {
          excludeBlogId: id,
        });
      } catch (cleanupError) {
        console.error("خطا در پاک‌سازی تصویر قبلی مقاله:", cleanupError);
      }
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

    await Blog.deleteOne({ _id: id });
    try {
      await deleteUnusedCloudinaryImages([blog.coverImage], {
        excludeBlogId: id,
      });
    } catch (cleanupError) {
      console.error("خطا در پاک‌سازی تصویر مقاله حذف‌شده:", cleanupError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در حذف وبلاگ" }, { status: 500 });
  }
}

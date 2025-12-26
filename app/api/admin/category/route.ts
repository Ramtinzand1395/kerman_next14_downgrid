import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Category from "@/model/Category";

// GET
export async function GET() {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const categories = await Category.find()
      .populate("parent")
      .sort({ _id: -1 }); // چون Prisma از id استفاده می‌کرد، اینجا _id

    return NextResponse.json(categories);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "مشکل در دریافت دسته‌ها" },
      { status: 500 }
    );
  }
}

// POST
export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  try {
    const body = await req.json();

    const newCategory = await Category.create({
      name: body.name,
      slug: body.slug,
      parent: body.parentId || null,
    });

    return NextResponse.json(newCategory);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "ایجاد دسته با خطا مواجه شد" },
      { status: 500 }
    );
  }
}

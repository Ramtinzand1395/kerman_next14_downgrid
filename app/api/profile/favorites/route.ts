// app/api/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Favorite from "@/model/Favorite";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }
    await dbConnect();

    const favorites = await Favorite.find({ userId: session.user.id })
      .populate({
        path: "productId",
        select: "title slug price discountPrice mainImage comments",
      })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(favorites);
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت علاقه‌مندی‌ها" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json(
        { error: "productId الزامی است" },
        { status: 400 }
      );
    }

    await dbConnect();

    const favorite = await Favorite.create({
      userId: session.user.id,
      productId,
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (err: any) {
    // جلوگیری از ثبت تکراری
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "این محصول قبلاً به علاقه‌مندی‌ها اضافه شده" },
        { status: 409 }
      );
    }

    console.error("POST /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در افزودن به علاقه‌مندی" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    const body = await req.json();
    const productId = body.productId;

    if (!productId) {
      return NextResponse.json(
        { error: "productId الزامی است" },
        { status: 400 }
      );
    }

    await dbConnect();

    await Favorite.deleteOne({
      userId: session.user.id,
      productId,
    });

    return NextResponse.json({ message: "با موفقیت حذف شد" });
  } catch (err) {
    console.error("DELETE /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در حذف علاقه‌مندی" },
      { status: 500 }
    );
  }
}

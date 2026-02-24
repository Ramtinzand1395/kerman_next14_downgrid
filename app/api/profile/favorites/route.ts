import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Favorite from "@/model/Favorite";
import User from "@/model/User";
import mongoose from "mongoose";

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
        select: "title slug price discountPrice mainImage",
        populate: {
          path: "comments",
          // اسم فیلدها رو مطابق Comment schema خودت تنظیم کن
          select: "text rating user createdAt",
        },
      })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(favorites);
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در دریافت علاقه‌مندی‌ها" },
      { status: 500 },
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
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(String(productId))) {
      return NextResponse.json(
        { error: "productId نامعتبر است" },
        { status: 400 },
      );
    }

    await dbConnect();

    const favorite = await Favorite.create({
      userId: session.user.id,
      productId,
    });
    await User.findByIdAndUpdate(session.user.id, {
      $addToSet: { favorites: favorite._id },
    });
    return NextResponse.json(favorite, { status: 201 });
  } catch (err: any) {
    // جلوگیری از ثبت تکراری
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "این محصول قبلاً به علاقه‌مندی‌ها اضافه شده" },
        { status: 409 },
      );
    }

    console.error("POST /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در افزودن به علاقه‌مندی" },
      { status: 500 },
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
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(String(productId))) {
      return NextResponse.json(
        { error: "productId نامعتبر است" },

        { status: 400 },
      );
    }

    await dbConnect();

    // const fav = await Favorite.deleteOne({
    const deletedFavorite = await Favorite.findOneAndDelete({
      userId: session.user.id,
      productId,
    });

    if (!deletedFavorite) {
      return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
    }

    await User.findByIdAndUpdate(session.user.id, {
      // $pull: { favorites: fav },
      $pull: { favorites: deletedFavorite._id },
    });

    return NextResponse.json({ message: "با موفقیت حذف شد" });
  } catch (err) {
    console.error("DELETE /api/favorites error:", err);
    return NextResponse.json(
      { error: "خطا در حذف علاقه‌مندی" },
      { status: 500 },
    );
  }
}

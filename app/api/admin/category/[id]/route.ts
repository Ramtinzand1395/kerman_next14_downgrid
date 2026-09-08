import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Category from "@/model/Category";
import Product from "@/model/Product";
import Coupon from "@/model/Loyalty Club/Coupon";
import CashbackRule from "@/model/Loyalty Club/CashbackRule";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }

    const category = await Category.findById(id).select("_id").lean();
    if (!category) {
      return NextResponse.json({ error: "دسته‌بندی پیدا نشد" }, { status: 404 });
    }

    const [childCategory, product, coupon, cashbackRule] = await Promise.all([
      Category.exists({ parent: id }),
      Product.exists({ category: id }),
      Coupon.exists({ categories: id }),
      CashbackRule.exists({ categories: id }),
    ]);

    if (childCategory || product || coupon || cashbackRule) {
      return NextResponse.json(
        {
          error:
            "این دسته‌بندی در داده‌های دیگر استفاده شده است. ابتدا وابستگی‌ها را تغییر دهید.",
        },
        { status: 409 },
      );
    }

    await Category.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در حذف دسته" }, { status: 500 });
  }
}

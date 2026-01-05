import dbConnect from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import User from "@/model/User";
import "@/model/Order";
import "@/model/Comment";
import "@/model/Favorite";
import "@/model/Address";

export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "orders",
        select: "finalPrice status createdAt",
      })

      .populate({
        path: "comments",
        select: "text rating verified  product createdAt ",
        populate: [{ path: "product", select: "title mainImage" }],
      })

      .populate({
        path: "favorites", // آرایه Favorite
        populate: {
          // populate محصول داخل هر Favorite
          path: "productId",
          select: "title mainImage", // فقط فیلدهای مورد نیاز
        },
      })
      .populate({
        path: "addresses",
        select: "province city address plaque unit postalCode",
      })
      .select("username email mobile role createdAt updatedAt"),
    User.countDocuments(),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// app/api/products/[slug]/comments/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Comment from "@/model/Comment";
import Product from "@/model/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    await dbConnect();

    const comments = await Comment.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .populate({
        path: "product",
        select: "title mainImage",
        model: Product,
      })
      .lean();
    return NextResponse.json(comments);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

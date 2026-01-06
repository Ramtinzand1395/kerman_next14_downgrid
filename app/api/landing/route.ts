
import dbConnect from "@/lib/mongodb";
import Comment from "@/model/Comment";
import Product from "@/model/Product";
import User from "@/model/User";
import { NextResponse } from "next/server";


export async function GET() {
  try {
    await dbConnect();

    const comments = await Comment.find({
      rating: 5,
      verified: true,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate({
        path: "product",
        select: "title mainImage",
        model: Product,
      })
      .populate({
        path: "user",
        select: "username ", // فقط اطلاعات نمایشی
        model: User,
      })
      .select("text rating user product createdAt") // فقط چیزهایی که لازم داریم
      .lean();

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

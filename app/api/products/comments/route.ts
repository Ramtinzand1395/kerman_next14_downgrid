// app/api/comments/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb"; // تابع اتصال به MongoDB
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import Comment from "@/model/Comment";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, text, rating } = body;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (!productId || !text) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    await dbConnect(); // اتصال به MongoDB

    const comment = await Comment.create({
      text,
      rating: rating || 5,
      product: productId, // فرض می‌کنیم فیلد product در مدل Comment نوع ObjectId است
      user: session.user.id, // فرض می‌کنیم user هم ObjectId است
      verified: false, // به صورت پیش‌فرض تایید نشده
    });

    return NextResponse.json(
      { message: "کامنت با موفقیت ثبت شد", comment },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "خطا در ثبت کامنت" }, { status: 500 });
  }
}

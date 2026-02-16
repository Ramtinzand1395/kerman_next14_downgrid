import dbConnect from "@/lib/mongodb";
import User from "@/model/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.mobile) {
      return NextResponse.json(
        { error: "برای عضویت در خبرنامه باید ابتدا وارد حساب خود شوید." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = body?.email?.toString().trim().toLowerCase();

    await dbConnect();

    const user = await User.findOne({ mobile: session.user.mobile });

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد." }, { status: 404 });
    }

    if (!user.email) {
      if (!email) {
        return NextResponse.json(
          { error: "برای تکمیل عضویت، ایمیل خود را وارد کنید." },
          { status: 400 }
        );
      }

      if (!EMAIL_REGEX.test(email)) {
        return NextResponse.json({ error: "ایمیل معتبر نیست." }, { status: 400 });
      }

      user.email = email;
    }

    if (user.newsletter) {
      await user.save();
      return NextResponse.json(
        { success: true, message: "این حساب قبلاً عضو خبرنامه شده است." },
        { status: 200 }
      );
    }

    user.newsletter = true;
    await user.save();

    return NextResponse.json(
      { success: true, message: "عضویت در خبرنامه با موفقیت انجام شد." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Newsletter subscribe error:", error);
    return NextResponse.json({ error: "خطا در ثبت عضویت" }, { status: 500 });
  }
}

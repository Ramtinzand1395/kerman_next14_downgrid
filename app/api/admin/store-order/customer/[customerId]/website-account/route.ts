import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { provisionStoreCustomerAccount } from "@/lib/store-customer-account";
import Customer from "@/model/Customer";
import User from "@/model/User";

export async function POST(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ message: "کاربر وارد نشده است." }, { status: 401 });
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ message: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { customerId } = await params;
  if (!mongoose.isObjectIdOrHexString(customerId)) {
    return NextResponse.json({ message: "شناسه مشتری معتبر نیست." }, { status: 400 });
  }

  try {
    await dbConnect();
    const customer = await Customer.findById(customerId).select("mobile name lastName").lean();
    if (!customer) return NextResponse.json({ message: "مشتری پیدا نشد." }, { status: 404 });

    await User.init();
    if (!await provisionStoreCustomerAccount(customer)) {
      return NextResponse.json({ message: "شماره موبایل مشتری را اصلاح کنید." }, { status: 422 });
    }

    return NextResponse.json({ message: "حساب سایت مشتری ثبت یا تکمیل شد." });
  } catch (error) {
    console.error("[store-customer] website account sync failed", error);
    return NextResponse.json({ message: "حساب سایت ذخیره نشد؛ دوباره تلاش کنید." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import CustomerGameOrder from "@/model/CustomerGameOrder";
import Notification from "@/model/Notification";
import User from "@/model/User";
import Address from "@/model/Address";
import { authOptions } from "../../auth/[...nextauth]/options";
import { customerGameOrderSchema } from "@/validations/validation";
import { stripHtmlTags } from "@/helpers/stripHtmlTags";
import mongoose from "mongoose";

/* ================= POST ================= */
// مسیر ثبت سفارش بازی مشتری — فقط کاربران واردشده
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "برای ثبت سفارش ابتدا وارد شوید." },
        { status: 401 },
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "کاربر یافت نشد." },
        { status: 404 },
      );
    }

    const body = await req.json();
    const sanitizedBody = {
      customerName: stripHtmlTags(body.customerName),
      phone: String(body.phone || "").trim(),
      addressId: String(body.addressId || "").trim(),
      message: stripHtmlTags(body.message || ""),
      products: Array.isArray(body.products)
        ? body.products.map((p: Record<string, unknown>) => ({
            name: stripHtmlTags(String(p.name ?? "")),
            platform: stripHtmlTags(String(p.platform ?? "")) || "",
            price: Number(p.price) || 0,
            size: Number(p.size) || 0,
          }))
        : [],
      totalPrice: Number(body.totalPrice) || 0,
    };

    try {
      await customerGameOrderSchema.validate(sanitizedBody, {
        abortEarly: false,
      });
    } catch (validationError: unknown) {
      const err = validationError as { errors?: Array<{ message: string }> };
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details: err.errors?.map((e) => e.message),
        },
        { status: 400 },
      );
    }

    // آدرس باید متعلق به همین کاربر باشد
    if (!mongoose.isValidObjectId(sanitizedBody.addressId)) {
      return NextResponse.json(
        { error: "آدرس انتخاب‌شده معتبر نیست." },
        { status: 400 },
      );
    }

    const address = await Address.findById(sanitizedBody.addressId).lean();
    if (!address || String(address.userId) !== String(user._id)) {
      return NextResponse.json(
        { error: "آدرس متعلق به کاربر نیست." },
        { status: 400 },
      );
    }

    // snapshot آدرس به‌صورت رشته‌ی یکپارچه برای پایداری سفارش تاریخی
    const addressSnapshot = [
      `${address.province} - ${address.city}`,
      address.address,
      address.plaque ? `پلاک ${address.plaque}` : "",
      address.unit ? `واحد ${address.unit}` : "",
      address.postalCode ? `کدپستی ${address.postalCode}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // بروزرسانی نام و شماره تماس روی رکورد User (همان اطلاعات پروفایل)
    // try {
    //   user.username = sanitizedBody.customerName;
    //   user.mobile = sanitizedBody.phone;
    //   await user.save();
    // } catch {
    //   return NextResponse.json(
    //     {
    //       error:
    //         "به‌روزرسانی اطلاعات کاربر ناموفق بود. شماره موبایل ممکن است تکراری باشد.",
    //     },
    //     { status: 400 },
    //   );
    // }

    const order = await CustomerGameOrder.create({
      customerName: sanitizedBody.customerName,
      phone: sanitizedBody.phone,
      address: addressSnapshot,
      addressRef: address._id,
      user: user._id,
      message: sanitizedBody.message,
      products: sanitizedBody.products,
      totalPrice: sanitizedBody.totalPrice,
    });

    await Notification.create({
      title: "سفارش بازی جدید",
      message: `یک سفارش بازی جدید از ${user.username}`,
      type: "customerGameOrder",
      for: "admin",
      isRead: false,
      user: user._id,
      target: {
        kind: "CustomerGameOrder",
        item: order._id,
      },
    });

    return NextResponse.json(
      { message: "سفارش با موفقیت ثبت شد.", order },
      { status: 201 },
    );
  } catch (error) {
    console.error("Customer order creation failed:", error);
    return NextResponse.json(
      { error: "خطایی در ثبت سفارش رخ داد. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}

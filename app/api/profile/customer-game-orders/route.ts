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

 
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

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
      return NextResponse.json({ error: "کاربر یافت نشد." }, { status: 404 });
    }

    const body = await req.json();
    const sanitizedBody = {
      customerName: stripHtmlTags(body.customerName),
      phone: String(body.phone || "").trim(),
      addressId: String(body.addressId || "").trim(),
      message: stripHtmlTags(body.message || ""),
      products: Array.isArray(body.products)
        ? body.products.map((p: Record<string, unknown>) => {
            const platform = stripHtmlTags(String(p.platform ?? "")).trim();
            const isStandardPs5 = platform.toLowerCase() === "ps5";
            return {
              name: stripHtmlTags(String(p.name ?? "")),
              platform,
              size: Number(p.size) || 0,
              // Capacity / execution type is meaningful only for standard PS5.
              gameType: isStandardPs5
                ? stripHtmlTags(String(p.gameType ?? "")) || ""
                : "",
            };
          })
        : [],
      totalPrice: 0,
    };

    const invalidPs5Product = sanitizedBody.products.find(
      (product: { platform?: string; gameType?: string }) =>
        product.platform?.toLowerCase() === "ps5" && !product.gameType,
    );
    if (invalidPs5Product) {
      return NextResponse.json(
        { error: "برای هر بازی PS5 استاندارد، ظرفیت / نوع اجرا را انتخاب کنید." },
        { status: 400 },
      );
    }

    try {
      await customerGameOrderSchema.validate(sanitizedBody, {
        abortEarly: false,
      });
    } catch (validationError: unknown) {
      const err = validationError as {
        errors?: string[];
        message?: string;
        inner?: Array<{ path?: string; message?: string }>;
      };
      const details = [
        ...(err.errors ?? []),
        ...(err.message && !err.errors?.length ? [err.message] : []),
      ];
      return NextResponse.json(
        {
          error: "اطلاعات ورودی نامعتبر است.",
          details,
          fields: err.inner?.reduce<Record<string, string[]>>(
            (fieldErrors, issue) => {
              if (!issue.path || !issue.message) return fieldErrors;
              fieldErrors[issue.path] = [
                ...(fieldErrors[issue.path] ?? []),
                issue.message,
              ];
              return fieldErrors;
            },
            {},
          ),
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

/* ================= GET ================= */
// لیست سفارش‌های بازی کاربر واردشده — فقط سفارش‌های خود کاربر برگردانده می‌شود
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "برای مشاهده سفارش‌ها ابتدا وارد شوید." },
        { status: 401 },
      );
    }

    await dbConnect();

    // فیلتر بر اساس کاربر فعلی — هیچ کاربری به سفارش کاربر دیگر دسترسی ندارد
    const orders = await CustomerGameOrder.find({ user: session.user.id })
      .populate("addressRef")
      .lean()
      .sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch customer game orders failed:", error);
    return NextResponse.json(
      { error: "خطایی در دریافت سفارش‌ها رخ داد." },
      { status: 500 },
    );
  }
}

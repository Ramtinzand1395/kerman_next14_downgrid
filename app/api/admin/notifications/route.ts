// app/api/admin/notifications/route.ts
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await dbConnect();
  // todo
  // اگه لازم شد اطلاعات بیشتر محصول
  // const notifications = await Notification.find({ for: "admin" })
  //   .populate("product", "title mainImage price sku","comment")
  //   .sort({ createdAt: -1 })
  //   .limit(20);
  const notifications = await Notification.find({ for: "admin" })
    // .populate({
    //   path: "product",
    //   select: "title mainImage price sku comments",
    //   populate: {
    //     path: "comments",
    //     select: "text rating user createdAt verified",
    //     populate: {
    //       path: "user",
    //       select: "username mobile",
    //     },
    //   },
    // })
    // .populate("target")
    .populate({
      path: "target.item",
      populate: [
        {
          path: "product",
          select: "title mainImage price sku", // اگر کامنت بود
        },
        {
          path: "user",
          select: "username mobile", // اگر کامنت یا سفارش بود
        },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(20);

  return NextResponse.json(notifications);
}

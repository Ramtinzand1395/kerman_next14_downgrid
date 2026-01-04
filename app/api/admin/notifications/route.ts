// app/api/admin/notifications/route.ts
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import "@/model/Order"
// export async function GET() {
//   const session = await getServerSession(authOptions);
//   if (!session || session.user.role !== "superadmin")
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

//   await dbConnect();
// console.log("first")
//   const notifications = await Notification.find({ for: "admin" })

//     .populate({
//       path: "target.item",
//       populate: [
//         {
//           path: "product",
//           select: "title mainImage price sku", // اگر کامنت بود
//         },
//         {
//           path: "user",
//           select: "username mobile", // اگر کامنت یا سفارش بود
//         },
//       ],
//     })
//     .sort({ createdAt: -1 })
//     .limit(20);

//   return NextResponse.json(notifications);
// }

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await dbConnect();

  // 1. گرفتن Notification ها بدون populate
  const notifications = await Notification.find({ for: "admin" })
    .sort({ createdAt: -1 })
    .limit(20);

  // 2. populate شرطی
  const populated = await Promise.all(
    notifications.map(async (n) => {
      if (n.type === "comment") {
        // populate Comment
        const populatedComment = await Notification.populate(n, {
          path: "target.item",
          model: "Comment", // مدل صحیح
          populate: [
            { path: "product", select: "title mainImage price sku" },
            { path: "user", select: "username mobile" },
          ],
        });
        return populatedComment;
      }

      if (n.type === "user") {
        // populate User
        const populatedUser = await Notification.populate(n, {
          path: "target.item",
          model: "User", // مدل صحیح
          select: "username mobile createdAt",
        });
        return populatedUser;
      }

      // if (n.type === "order") {
      //   // populate Comment
      //   const populatedOrder = await Notification.populate(n, {
      //     path: "target.item",
      //     model: "Order", // مدل صحیح
      //     // populate: [
      //     //   { path: "product", select: "title mainImage price sku" },
      //     //   { path: "user", select: "username mobile" },
      //     // ],
      //   });
      //   return populatedOrder;
      // }
       if (n.type === "order") {
      return Notification.populate(n, {
        path: "target.item",
        populate: [
          {
            path: "user",
            select: "username mobile",
          },
          {
            path: "items.product",
            select: "title mainImage price",
          },
        ],
      });
    }

      return n;
    })
  );

  return NextResponse.json(populated);
}

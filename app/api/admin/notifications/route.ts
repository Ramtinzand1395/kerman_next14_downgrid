// app/api/admin/notifications/route.ts
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { NextResponse } from "next/server";
import "@/model/Order";
import "@/model/Comment";
import "@/model/Product";
import "@/model/ContactMessage";
import "@/model/User";
import "@/model/CustomerGameOrder";
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

      if (n.type === "customerGameOrder") {
        return Notification.populate(n, {
          path: "target.item",
          model: "CustomerGameOrder",
          populate: [
            { path: "user", select: "username mobile createdAt" },
            { path: "addressRef" },
          ],
        });
      }
      if (n.type === "contact") {
        return Notification.populate(n, {
          path: "target.item",
          model: "ContactMessage",
          select: "name email phone subject message createdAt",
        });
      }
      return n;
    }),
  );

  // Do not expose stale notifications whose referenced record was deleted.
  const validNotifications = populated.filter((notification) => {
    const typedTarget = ["comment", "user", "order", "customerGameOrder", "contact"].includes(
      notification.type,
    );
    return !typedTarget || Boolean(notification.target?.item);
  });

  return NextResponse.json(validNotifications);
}

// import { NextRequest, NextResponse } from "next/server";
// import dbConnect from "@/lib/mongodb";
// import Comment from "@/model/Comment";
// import Notification from "@/model/Notification";
// import { getServerSession } from "next-auth";
// import { authOptions } from "../../../auth/[...nextauth]/options";
// import Product from "@/model/Product";
// import { revalidatePath } from "next/cache";
// export async function PUT(req: NextRequest) {
//   const session = await getServerSession(authOptions);
//   if (!session || session.user.role !== "superadmin")
//     return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

//   await dbConnect();
//   const body = await req.json();

//   const comment = await Comment.findByIdAndUpdate(
//     body.id,
//     { verified: true },
//     { returnDocument: "after" },
//   );

//   // نوتیفیکیشن مربوطه رو خوانده شده کن
//   await Notification.updateMany(
//     { type: "comment", product: comment?.product },
//     { isRead: true },
//   );
//   if (comment?.product) {
//     const product = await Product.findById(comment.product)
//       .select("slug")
//       .lean();
//     if (product?.slug) {
//       revalidatePath(`/product/${product.slug}`);
//       revalidatePath(`/api/products/${product.slug}`);
//     }
//   }
//   return NextResponse.json({ success: true, comment });
// }

// بعد از chat
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Comment from "@/model/Comment";
import Notification from "@/model/Notification";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/options";
import Product from "@/model/Product";
import { revalidatePath } from "next/cache";
import { notifyUser } from "@/lib/notifications/service";
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await dbConnect();
  const body = await req.json();

  // فقط گذار از «تأییدنشده → تأییدشده» معتبر است تا هوک XP دوبار اجرا نشود
  const comment = await Comment.findOneAndUpdate(
    { _id: body.id, verified: false },
    { verified: true },
    { returnDocument: "after" },
  );

  if (!comment) {
    return NextResponse.json({
      success: true,
      alreadyApproved: true,
    });
  }

  // باشگاه مشتریان: XP ثبت نظر + پیشرفت ماموریت + نشان‌ها
  try {
    const { onApprovedReview } = await import(
      "@/lib/loyalty/purchase.hooks"
    );
    await onApprovedReview(comment.user.toString(), comment._id.toString());
  } catch (err) {
    console.error("[loyalty] review hook failed:", err);
  }

  // نوتیفیکیشن مربوطه رو خوانده شده کن
  await Notification.updateMany(
    { type: "comment", product: comment?.product },
    { isRead: true },
  );
  if (comment?.product) {
    const product = await Product.findById(comment.product)
      .select("slug")
      .lean();
    if (product?.slug) {
      await notifyUser({
        userId: comment.user,
        title: "نظر شما تایید شد",
        message: "نظر شما بررسی و در صفحه محصول منتشر شد.",
        type: "COMMENT_APPROVED",
        category: "support",
        entityType: "Comment",
        entityId: comment._id,
        link: `/product/${product.slug}`,
        senderType: "admin",
        senderId: session.user.id,
        eventKey: `COMMENT_APPROVED:${comment._id}`,
      }).catch((error) => console.error("[notifications] comment-approved event failed:", error));
      revalidatePath(`/product/${product.slug}`);
      revalidatePath(`/api/products/${product.slug}`);
    }
  }
  return NextResponse.json({ success: true, comment });
}

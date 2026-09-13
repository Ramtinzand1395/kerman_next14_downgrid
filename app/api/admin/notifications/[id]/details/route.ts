import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Notification from "@/model/Notification";
import Order from "@/model/Order";
import Comment from "@/model/Comment";
import ContactMessage from "@/model/ContactMessage";
import User from "@/model/User";
import CustomerGameOrder from "@/model/CustomerGameOrder";

async function getEntity(kind: string, entityId: mongoose.Types.ObjectId) {
  switch (kind) {
    case "Comment":
      return Comment.findById(entityId)
        .populate("product", "title mainImage price sku slug")
        .populate("user", "username mobile")
        .lean();
    case "User":
      return User.findById(entityId).select("username mobile createdAt").lean();
    case "Order":
      return Order.findById(entityId)
        .populate("user", "username mobile")
        .populate("items.product", "title mainImage price")
        .lean();
    case "ContactMessage":
      return ContactMessage.findById(entityId)
        .select("name email phone subject message createdAt")
        .lean();
    case "CustomerGameOrder":
      return CustomerGameOrder.findById(entityId)
        .populate("user", "username mobile createdAt")
        .populate("addressRef")
        .lean();
    default:
      return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "شناسه اعلان نامعتبر است." }, { status: 400 });
  }

  await dbConnect();
  const notification = await Notification.findOne({
    _id: id,
    $or: [
      { recipientRole: "ADMIN", recipientId: session.user.id },
      { recipientRole: "ADMIN", recipientId: null },
      { for: "admin", recipientRole: { $exists: false } },
    ],
  });

  if (!notification) {
    return NextResponse.json({ error: "اعلان پیدا نشد." }, { status: 404 });
  }

  const kind = notification.entityType || notification.target?.kind;
  const rawEntityId = notification.entityId || notification.target?.item;
  const manageableKinds = new Set([
    "Comment",
    "User",
    "Order",
    "ContactMessage",
    "CustomerGameOrder",
  ]);

  if (kind && manageableKinds.has(kind)) {
    if (!rawEntityId || !mongoose.isValidObjectId(rawEntityId)) {
      return NextResponse.json({ error: "رکورد مرتبط معتبر نیست." }, { status: 404 });
    }

    const entityId = new mongoose.Types.ObjectId(String(rawEntityId));
    const entity = await getEntity(kind, entityId);
    if (!entity) {
      return NextResponse.json({ error: "رکورد مرتبط حذف شده است." }, { status: 404 });
    }

    return NextResponse.json({
      notification: {
        ...notification.toObject(),
        entityType: kind,
        entityId,
        target: { kind, item: entity },
      },
    });
  }

  return NextResponse.json({ notification });
}

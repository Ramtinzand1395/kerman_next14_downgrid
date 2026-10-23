import mongoose from "mongoose";
import Order from "@/model/Order";
import "@/model/Address";
import "@/model/Product";
import { ensurePaidOrderIdentifiers } from "@/lib/orderIdentifiers";
import { toOrderDto } from "@/lib/orderDto";

export async function getOrderForViewer(input: {
  orderId: string;
  userId: string;
  role?: string | null;
  paidOnly?: boolean;
}) {
  if (!mongoose.isValidObjectId(input.orderId)) return null;

  const canViewAny = input.role === "admin" || input.role === "superadmin";
  const query: Record<string, unknown> = { _id: input.orderId };
  if (!canViewAny) query.user = input.userId;
  if (input.paidOnly) query.paymentStatus = "paid";

  let order: any = await Order.findOne(query)
    .populate({ path: "items.product", select: "title mainImage sku" })
    .populate({
      path: "address",
      select: "province city address plaque unit postalCode",
    })
    .lean();

  if (!order) return null;

  if (
    order.paymentStatus === "paid" &&
    (!order.invoiceNumber || !order.trackingCode)
  ) {
    await ensurePaidOrderIdentifiers(order._id);
    order = await Order.findOne(query)
      .populate({ path: "items.product", select: "title mainImage sku" })
      .populate({
        path: "address",
        select: "province city address plaque unit postalCode",
      })
      .lean();
  }

  return order ? toOrderDto(order, "order") : null;
}

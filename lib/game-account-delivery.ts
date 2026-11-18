import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";

interface PaidOrder {
  _id: mongoose.Types.ObjectId;
  items: { _id: mongoose.Types.ObjectId; productTitle?: string; variantTitle?: string; quantity: number; isOnlineGame?: boolean }[];
}
type Delivery = { _id: string; encrypted: string };
export async function gameSlots(user?: string, orderId?: string) {
  await dbConnect();
  const orders = await Order.find({
    paymentStatus: "paid", status: { $ne: "cancelled" }, "items.isOnlineGame": true,
    ...(user ? { user } : {}), ...(orderId ? { _id: orderId } : {}),
  }).select("items").sort({ createdAt: -1 }).lean<PaidOrder[]>();
  return orders.flatMap(order => order.items.filter(item => item.isOnlineGame).flatMap(item =>
    Array.from({ length: item.quantity }, (_, unit) => ({
      id: [order._id, item._id, unit].join(":"), title: [item.productTitle, item.variantTitle].filter(Boolean).join(" • "),
    }))
  ));
}
export function deliveries() {
  return mongoose.connection.db!.collection<Delivery>("gameaccountdeliveries");
}
function key() {
  const secret = process.env.GAME_ACCOUNT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Game account encryption key is missing");
  return Buffer.from(hkdfSync("sha256", secret, "kermanatari", "game-account-delivery-v1", 32));
}
export function seal(id: string, email: string, password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(id));
  const bytes = Buffer.concat([cipher.update(JSON.stringify({ email, password }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), bytes]).toString("base64");
}
export function openDelivery(record: Delivery): { email: string; password: string } {
  const bytes = Buffer.from(record.encrypted, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(record._id));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
}

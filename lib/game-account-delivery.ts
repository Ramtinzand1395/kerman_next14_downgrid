import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Order from "@/model/Order";
import Product from "@/model/Product";

interface PaidOrder {
  _id: mongoose.Types.ObjectId;
  trackingCode?: string;
  items: {
    _id: mongoose.Types.ObjectId;
    product: mongoose.Types.ObjectId;
    productTitle?: string | null;
    productImage?: string | null;
    variantTitle?: string | null;
    variantAttributes?: { key: string; label: string; optionLabel: string }[];
    quantity: number;
    isOnlineGame?: boolean;
  }[];
}

type Delivery = { _id: string; encrypted: string };
type Credentials = { email: string; password: string };
type GuideItem = { key: string; value: string };
type AccountProduct = {
  _id: mongoose.Types.ObjectId;
  title?: string;
  mainImage?: string;
  specifications?: { title: string; items: GuideItem[] }[];
};

export type GameAccount = {
  id: string;
  title: string;
  image: string | null;
  orderNumber: string;
  platform: string | null;
  capacity: string | null;
  variant: string | null;
  guide: GuideItem[];
} & (
  | { status: "pending" | "unavailable" }
  | { status: "ready"; credentials: Credentials }
);

export async function gameSlots(user?: string, orderId?: string) {
  await dbConnect();
  const orders = await Order.find({
    paymentStatus: "paid", status: { $ne: "cancelled" }, "items.isOnlineGame": true,
    ...(user ? { user } : {}), ...(orderId ? { _id: orderId } : {}),
  }).select("items trackingCode").sort({ createdAt: -1 }).lean<PaidOrder[]>();

  return orders.flatMap(order => order.items.filter(item => item.isOnlineGame).flatMap(item =>
    Array.from({ length: item.quantity }, (_, unit) => ({
      id: [order._id, item._id, unit].join(":"),
      title: [item.productTitle, item.variantTitle].filter(Boolean).join(" • "),
      orderNumber: order.trackingCode || String(order._id).slice(-8).toUpperCase(),
      item,
    }))
  ));
}

export function deliveries() {
  return mongoose.connection.db!.collection<Delivery>("gameaccountdeliveries");
}

type GameSlotItem = PaidOrder["items"][number];

function platformFromLabel(label?: string | null) {
  const matches = Array.from(
    (label ?? "").matchAll(/(?:\b(?:ps|play\s*station)|پلی[\s‌-]*استیشن)[\s‌-]*([45۴۵٤٥])(?![\d۰-۹٠-٩])/gi),
    match => /[4۴٤]/.test(match[1]) ? "PS4" : "PS5",
  );
  return new Set(matches).size === 1 ? matches[0] : null;
}

function variantDetails(item: GameSlotItem, productTitle?: string) {
  const attributes = item.variantAttributes ?? [];
  const platformAttribute = attributes.find(({ key, label }) =>
    /platform|پلتفرم|دستگاه|کنسول/i.test(`${key} ${label}`),
  );
  const capacityAttribute = attributes.find(({ key, label }) =>
    /capacity|ظرفیت/i.test(`${key} ${label}`),
  );
  const selectedPlatform = platformAttribute?.optionLabel?.trim();
  const numericPlatform = selectedPlatform?.match(/^([45۴۵٤٥])$/)?.[1];
  const platform =
    platformFromLabel(numericPlatform ? `PS${numericPlatform}` : selectedPlatform) ||
    platformFromLabel(attributes.map(({ optionLabel }) => optionLabel).join(" ")) ||
    platformFromLabel(item.variantTitle) ||
    platformFromLabel(productTitle);
  const legacyCapacity = [item.variantTitle, productTitle].filter(Boolean).join(" ")
    .match(/ظرفیت[\s‌:-]*([123۱۲۳١٢٣](?![\d۰-۹٠-٩])|اول|دوم|سوم)/)?.[1];
  const capacity = capacityAttribute?.optionLabel?.trim().replace(/^ظرفیت[\s‌:-]+/, "") || legacyCapacity || null;

  return { platform, capacity, variant: !platform && !capacity ? item.variantTitle || null : null };
}

// Product specifications are the existing source for published instructions.
const guideLabel = /(?:راهنمای|آموزش|روش|نحوه)[\s‌]+(?:نصب|استفاده|فعال[\s‌-]*سازی)/;

export async function getCustomerGameAccounts(userId: string): Promise<GameAccount[]> {
  // gameSlots also serves the admin view, where an omitted owner means all orders.
  if (!mongoose.isValidObjectId(userId)) return [];
  const slots = await gameSlots(userId);
  if (!slots.length) return [];

  const productIds = slots.map(({ item }) => item.product).filter(Boolean);
  const [records, products] = await Promise.all([
    deliveries().find({ _id: { $in: slots.map(slot => slot.id) } }).toArray(),
    Product.find({ _id: { $in: productIds } }).select("title mainImage specifications")
      .lean<AccountProduct[]>(),
  ]);
  const recordsById = new Map(records.map(record => [record._id, record]));
  const productsById = new Map(products.map(product => [String(product._id), product]));

  return slots.map(({ id, item, orderNumber }) => {
    const product = productsById.get(String(item.product));
    const productTitle = item.productTitle || product?.title;
    const guide = (product?.specifications ?? []).flatMap(group =>
      (group.items ?? []).filter(item =>
        item.value?.trim() && (guideLabel.test(group.title) || guideLabel.test(item.key)),
      ),
    ).map(({ key, value }) => ({ key, value }));
    const metadata = {
      id,
      orderNumber,
      title: productTitle || item.variantTitle || "بازی اکانتی",
      image: item.productImage || product?.mainImage || null,
      ...variantDetails(item, productTitle),
      guide,
    };
    const record = recordsById.get(id);
    if (!record) return { ...metadata, status: "pending" };

    try {
      const { email, password } = openDelivery(record);
      if (typeof email === "string" && email.trim() && typeof password === "string" && password) {
        return { ...metadata, status: "ready", credentials: { email, password } };
      }
    } catch {
      // Keep other purchased accounts available if this record cannot be decrypted.
    }
    return { ...metadata, status: "unavailable" };
  });
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

export function openDelivery(record: Delivery): Credentials {
  const bytes = Buffer.from(record.encrypted, "base64");
  const cipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(record._id));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8"));
}

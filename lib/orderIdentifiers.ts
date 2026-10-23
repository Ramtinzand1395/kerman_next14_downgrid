import Order from "@/model/Order";
export { buildOrderIdentifiers } from "@/lib/orderIdentifierValue";
import { buildOrderIdentifiers } from "@/lib/orderIdentifierValue";

/**
 * Backfills identifiers without rewriting financial history. Each value is a
 * deterministic function of MongoDB's unique ObjectId, so concurrent calls
 * write the same unique value and refreshes cannot rotate the number.
 */
export async function ensurePaidOrderIdentifiers(orderId: unknown) {
  const identifiers = buildOrderIdentifiers(orderId);

  await Promise.all([
    Order.updateOne(
      {
        _id: orderId,
        paymentStatus: "paid",
        $or: [
          { invoiceNumber: { $exists: false } },
          { invoiceNumber: null },
          { invoiceNumber: "" },
        ],
      },
      { $set: { invoiceNumber: identifiers.invoiceNumber } },
    ),
    Order.updateOne(
      {
        _id: orderId,
        paymentStatus: "paid",
        $or: [
          { trackingCode: { $exists: false } },
          { trackingCode: null },
          { trackingCode: "" },
        ],
      },
      { $set: { trackingCode: identifiers.trackingCode } },
    ),
  ]);

  return identifiers;
}

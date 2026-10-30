import { formatOrderShippingDisplay } from "@/lib/shipping";
import { summarizeOrderMoney } from "@/lib/orderSummary";

type AnyRecord = Record<string, any>;

const stringValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

const isoDate = (value: unknown) => {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export function toOrderDto(record: AnyRecord, source: "order" | "payment_attempt") {
  const isOrder = source === "order";
  const items = Array.isArray(record.items) ? record.items : [];
  const addressSnapshot = record.addressSnapshot;
  const addressFallback =
    record.address && typeof record.address === "object" ? record.address : null;
  const address = addressSnapshot || addressFallback;
  const hasAddressSnapshot = Boolean(addressSnapshot);

  const mappedItems = items.map((item: AnyRecord, index: number) => {
    const productFallback =
      item.product && typeof item.product === "object" ? item.product : null;
    const productId = stringValue(productFallback?._id ?? item.product);
    const title = stringValue(item.productTitle || productFallback?.title);
    const image = stringValue(item.productImage || productFallback?.mainImage);
    const sku = stringValue(
      item.variantSku || item.productSku || productFallback?.sku,
    );

    return {
      id: stringValue(item._id || `${productId}:${item.variantId || index}`),
      productId,
      variantId: stringValue(item.variantId) || null,
      title: title || "محصول حذف‌شده",
      image: image || null,
      sku: sku || null,
      variantTitle: stringValue(item.variantTitle) || null,
      variantAttributes: Array.isArray(item.variantAttributes)
        ? item.variantAttributes
            .map((attribute: AnyRecord) => ({
              groupId: stringValue(attribute.groupId),
              key: stringValue(attribute.key),
              label: stringValue(attribute.label),
              optionId: stringValue(attribute.optionId),
              optionLabel: stringValue(attribute.optionLabel),
            }))
            .filter((attribute: AnyRecord) => attribute.label && attribute.optionLabel)
        : [],
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      discountPrice:
        item.discountPrice === null || item.discountPrice === undefined
          ? null
          : Number(item.discountPrice),
      total: Number(item.total || 0),
      historicalFallback: !item.productTitle || !item.productImage,
    };
  });

  const summary = summarizeOrderMoney({
    items: mappedItems,
    totalPrice: record.totalPrice,
    couponDiscount: record.couponDiscount,
    shippingCost: record.shippingCost,
    finalPrice: record.finalPrice,
  });
  const shipping = formatOrderShippingDisplay(record);
  const attemptPaymentStatus =
    record.status === "paid_pending" || record.status === "refund_required"
      ? "review"
      : "unpaid";

  return {
    source,
    id: stringValue(record._id),
    orderNumber: isOrder
      ? stringValue(record.trackingCode) || stringValue(record._id).slice(-8).toUpperCase()
      : null,
    trackingCode: isOrder ? stringValue(record.trackingCode) || null : null,
    invoiceNumber: isOrder ? stringValue(record.invoiceNumber) || null : null,
    invoiceEligible: isOrder && record.paymentStatus === "paid",
    createdAt: isoDate(record.createdAt),
    updatedAt: isoDate(record.updatedAt),
    status: stringValue(record.status),
    payment: {
      status: isOrder ? stringValue(record.paymentStatus) : attemptPaymentStatus,
      gateway: isOrder ? stringValue(record.paymentGateway) || null : null,
      amountPaidOnlineToman:
        isOrder && record.paymentStatus === "paid" ? summary.payable : 0,
      referenceId:
        isOrder && record.paymentRefId !== null && record.paymentRefId !== undefined
          ? stringValue(record.paymentRefId)
          : null,
      verifiedAt: isOrder ? isoDate(record.paymentVerifiedAt) : null,
    },
    buyer: isOrder
      ? {
          name: stringValue(record.buyerSnapshot?.name) || null,
          mobile: stringValue(record.buyerSnapshot?.mobile) || null,
        }
      : null,
    seller: isOrder && record.sellerSnapshot?.name
      ? {
          name: stringValue(record.sellerSnapshot.name),
          phone: stringValue(record.sellerSnapshot.phone),
          email: stringValue(record.sellerSnapshot.email),
          address: stringValue(record.sellerSnapshot.address),
          historicalFallback: false,
        }
      : null,
    address: address
      ? {
          province: stringValue(address.province),
          city: stringValue(address.city),
          address: stringValue(address.address),
          plaque: stringValue(address.plaque),
          unit: stringValue(address.unit),
          postalCode: stringValue(address.postalCode),
          recipientName: stringValue(address.recipientName) || null,
          recipientMobile: stringValue(address.recipientMobile) || null,
          historicalFallback: !hasAddressSnapshot,
        }
      : null,
    items: mappedItems,
    summary,
    shipping: {
      method: stringValue(record.shipping?.method) || null,
      title: shipping.title,
      feeToman: shipping.feeToman,
      paymentTiming: stringValue(record.shipping?.paymentTiming) ||
        (shipping.isCollect ? "on_delivery" : null),
      feeStatus: stringValue(record.shipping?.feeStatus) ||
        (shipping.isCollect ? "pending_carrier" : null),
      paymentType: stringValue(record.shippingPaymentType) || null,
      label: shipping.label,
      note: shipping.subtext || null,
      isCollect: shipping.isCollect,
      trackingCode: stringValue(record.shipping?.trackingCode) || null,
    },
    couponCode: stringValue(record.couponCode) || null,
    historicalFallback:
      !hasAddressSnapshot || mappedItems.some((item) => item.historicalFallback),
  };
}

export type OrderDto = ReturnType<typeof toOrderDto>;

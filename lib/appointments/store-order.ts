import type { PipelineStage } from "mongoose";
import type { AppointmentItem } from "@/types/appointments";

export function websiteOrderUrl(item: Pick<AppointmentItem, "_id" | "fulfillment">) {
  const params = new URLSearchParams({ appointment: item._id });
  if (item.fulfillment === "courier") params.set("tab", "courier");
  return `/dashboard/appointments?${params}`;
}

export function websiteStoreOrders(activeOnly: boolean): PipelineStage[] {
  return [
    { $match: {
      storeOrderRegisteredAt: { $ne: null },
      ...(activeOnly ? {
        status: { $in: ["confirmed", "completed"] },
        storeOrderDeliveredAt: null,
        "courier.status": { $nin: ["delivered", "cancelled"] },
      } : {}),
    } },
    { $lookup: { from: "customers", localField: "storeOrderCustomer", foreignField: "_id", as: "storeCustomer" } },
    { $project: {
      appointmentId: "$_id",
      fulfillment: 1,
      description: 1,
      updatedAt: 1,
      createdAt: "$storeOrderRegisteredAt",
      deliveryCode: "$trackingCode",
      serviceType: 1,
      consoleType: { $switch: { branches: [
        { case: { $and: [{ $eq: ["$installationType", "copy"] }, { $eq: ["$device", "ps5"] }] }, then: "ps5Copy" },
        { case: { $and: [{ $eq: ["$installationType", "copy"] }, { $eq: ["$device", "ps4"] }] }, then: "copy" },
      ], default: "$device" } },
      customer: { $ifNull: [{ $first: "$storeCustomer" }, { lastName: "$customerName", mobile: "$phone" }] },
      price: { $ifNull: ["$pricing.finalAmount", null] },
      serviceBaseAmount: { $ifNull: ["$pricing.serviceBaseAmount", "$pricing.baseAmount"] },
      list: { $map: { input: { $ifNull: ["$selectedGames", []] }, as: "game", in: {
        _id: { $concat: ["$$game.platform", ":", "$$game.gameId"] },
        name: "$$game.name", size: "$$game.sizeGB",
      } } },
      deliveryDate: { $ifNull: ["$storeOrderDeliveredAt", "$courier.deliveredAt"] },
      deliveryStatus: { $switch: { branches: [
        { case: { $in: ["$status", ["cancelled", "rejected", "no_show"]] }, then: "بسته‌شده" },
        { case: { $or: [
          { $ne: [{ $ifNull: ["$storeOrderDeliveredAt", null] }, null] },
          { $eq: ["$courier.status", "delivered"] },
        ] }, then: "تحویل به مشتری" },
        { case: { $eq: ["$status", "completed"] }, then: "آماده" },
      ], default: "دریافت از مشتری" } },
    } },
  ];
}

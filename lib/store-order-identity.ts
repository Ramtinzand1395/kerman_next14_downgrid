import type { PipelineStage } from "mongoose";
export const storeCustomerProjection = {
  _id: 1, mobile: 1, username: 1, firstName: 1, lastName: 1, gender: 1, birthday: 1,
  createdAt: 1, updatedAt: 1, role: 1, phoneVerifiedAt: 1, registrationCompletedAt: 1,
  storeOrderPendingSignup: 1, storeProfile: 1, barcodes: 1,
} as const;


export function storeOrderCustomerJoin(): PipelineStage[] {
  return [
    { $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      pipeline: [{ $project: storeCustomerProjection }],
      as: "linkedUser",
    } },
    { $lookup: {
      from: "users",
      localField: "customer",
      foreignField: "legacyCustomerId",
      pipeline: [{ $match: { legacyCustomerId: { $exists: true } } }, { $project: storeCustomerProjection }],
      as: "legacyUser",
    } },
    { $set: { customer: { $ifNull: [
      { $first: "$linkedUser" },
      { $first: "$legacyUser" },
      null,
    ] } } },
    { $unset: ["linkedUser", "legacyUser"] },
  ];
}

// Read-only audit. This script intentionally performs no update, migration or repair.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is required");
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const db = client.db();
  const users = db.collection("users");
  const referrals = db.collection("referrals");

  const [
    usersWithoutRegistrationEvidence,
    legacyRewardedWithoutStepMarkers,
    partialOrInterruptedRewards,
    ledgerMismatches,
  ] = await Promise.all([
    users.countDocuments({
      $or: [
        { phoneVerifiedAt: { $exists: false } },
        { registrationCompletedAt: { $exists: false } },
      ],
    }),
    referrals.countDocuments({
      status: "rewarded",
      $or: [
        { referrerRewardedAt: { $exists: false } },
        { refereeRewardedAt: { $exists: false } },
        { xpRewardedAt: { $exists: false } },
      ],
    }),
    referrals.countDocuments({
      status: { $in: ["first_purchase", "rewarding"] },
      firstOrder: { $exists: true },
    }),
    referrals
      .aggregate([
        { $match: { status: "rewarded" } },
        {
          $lookup: {
            from: "wallettransactions",
            let: { referralId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: [
                      "$idempotencyKey",
                      [
                        {
                          $concat: [
                            "referral:referrer:",
                            "$$referralId",
                          ],
                        },
                        {
                          $concat: [
                            "referral:referee:",
                            "$$referralId",
                          ],
                        },
                      ],
                    ],
                  },
                  status: "completed",
                },
              },
              { $project: { idempotencyKey: 1 } },
            ],
            as: "walletLedger",
          },
        },
        {
          $lookup: {
            from: "experiencehistories",
            let: { referralId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: [
                      "$idempotencyKey",
                      { $concat: ["xp:referral:", "$$referralId"] },
                    ],
                  },
                },
              },
              { $project: { _id: 1 } },
            ],
            as: "xpLedger",
          },
        },
        {
          $set: {
            requiredWalletEntries: {
              $add: [
                { $cond: [{ $gt: ["$referrerReward", 0] }, 1, 0] },
                { $cond: [{ $gt: ["$refereeReward", 0] }, 1, 0] },
              ],
            },
            requiredXpEntries: {
              $cond: [{ $gt: [{ $ifNull: ["$xpReward", 0] }, 0] }, 1, 0],
            },
          },
        },
        {
          $match: {
            $expr: {
              $or: [
                {
                  $lt: [{ $size: "$walletLedger" }, "$requiredWalletEntries"],
                },
                { $lt: [{ $size: "$xpLedger" }, "$requiredXpEntries"] },
              ],
            },
          },
        },
        { $project: { _id: 1 } },
        { $limit: 100 },
      ])
      .toArray(),
  ]);

  console.log(
    JSON.stringify(
      {
        readOnly: true,
        usersWithoutRegistrationEvidence,
        legacyRewardedWithoutStepMarkers,
        partialOrInterruptedRewards,
        rewardedLedgerMismatchSampleCount: ledgerMismatches.length,
        rewardedLedgerMismatchReferralIds: ledgerMismatches.map(({ _id }) =>
          _id.toString(),
        ),
        warning:
          "Legacy rewarded records are report-only and must not be repaid automatically.",
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}

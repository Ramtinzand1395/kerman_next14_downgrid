import { randomUUID } from "node:crypto";
import { ObjectId, type Collection, type Filter } from "mongodb";

export type PrintRecoveryAction = "release_not_printed" | "mark_printed";

type RecoveryEntry = {
  action: PrintRecoveryAction;
  reason: string;
  actorUserId: string;
  fromStatus: string;
  fromConsumerId: string;
  resolvedAt: Date;
};

export type PrintQueueRecord = {
  _id?: ObjectId;
  payload?: unknown;
  status?: "pending" | "delivered" | "completed" | null;
  assignedConsumerId?: string | null;
  assignedAt?: Date | null;
  deliveredAt?: Date | null;
  deliveryAttemptId?: string | null;
  deliveryCount?: number;
  completedAt?: Date | null;
  recoveryHistory?: RecoveryEntry[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type PrintQueueCollection = Collection<PrintQueueRecord>;

export type PrintAckResult =
  | { state: "completed"; alreadyProcessed: false }
  | { state: "completed"; alreadyProcessed: true }
  | { state: "not-found"; alreadyProcessed: false };

const safelyQueuedFilter: Filter<PrintQueueRecord> = {
  assignedConsumerId: null,
  $or: [
    { status: "pending" },
    { status: null },
    { status: { $exists: false } },
  ],
};

export async function claimPrintJobs(
  collection: PrintQueueCollection,
  consumerId: string,
  limit = 100,
) {
  const deliveryAttemptId = randomUUID();
  const claimed: PrintQueueRecord[] = [];

  for (let index = 0; index < limit; index += 1) {
    const now = new Date();
    const job = await collection.findOneAndUpdate(
      safelyQueuedFilter,
      {
        $set: {
          assignedConsumerId: consumerId,
          assignedAt: now,
          deliveredAt: now,
          deliveryAttemptId,
          status: "delivered",
          updatedAt: now,
        },
        $inc: { deliveryCount: 1 },
      },
      {
        sort: { createdAt: 1, _id: 1 },
        returnDocument: "after",
        projection: { _id: 1, payload: 1, createdAt: 1, updatedAt: 1 },
      },
    );
    if (!job) break;
    claimed.push(job);
  }

  return claimed;
}

export async function acknowledgeOwnedPrintJob(
  collection: PrintQueueCollection,
  jobId: string,
  consumerId: string,
): Promise<PrintAckResult> {
  const _id = new ObjectId(jobId);
  const completed = await collection.findOneAndUpdate(
    {
      _id,
      assignedConsumerId: consumerId,
      status: { $in: ["delivered", "pending"] },
    },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after", projection: { status: 1 } },
  );
  if (completed) return { state: "completed", alreadyProcessed: false };

  const existing = await collection.findOne(
    { _id, assignedConsumerId: consumerId },
    { projection: { status: 1 } },
  );
  if (existing?.status === "completed") {
    return { state: "completed", alreadyProcessed: true };
  }
  return { state: "not-found", alreadyProcessed: false };
}

export async function listPrintRecoveryCandidates(
  collection: PrintQueueCollection,
  limit = 100,
) {
  return collection
    .find(
      {
        assignedConsumerId: { $type: "string" },
        status: { $in: ["delivered", "pending"] },
      },
      {
        projection: {
          _id: 1,
          payload: 1,
          status: 1,
          assignedConsumerId: 1,
          assignedAt: 1,
          deliveredAt: 1,
          deliveryAttemptId: 1,
          deliveryCount: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    )
    .sort({ deliveredAt: 1, assignedAt: 1, createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function resolvePrintJobRecovery(
  collection: PrintQueueCollection,
  input: {
    jobId: string;
    expectedConsumerId: string;
    action: PrintRecoveryAction;
    reason: string;
    actorUserId: string;
  },
) {
  const _id = new ObjectId(input.jobId);
  const candidate = await collection.findOne(
    {
      _id,
      assignedConsumerId: input.expectedConsumerId,
      status: { $in: ["delivered", "pending"] },
    },
    { projection: { status: 1, assignedConsumerId: 1 } },
  );
  if (
    !candidate ||
    (candidate.status !== "delivered" && candidate.status !== "pending") ||
    typeof candidate.assignedConsumerId !== "string"
  ) {
    return null;
  }

  const resolvedAt = new Date();
  const recoveryEntry = {
    action: input.action,
    reason: input.reason,
    actorUserId: input.actorUserId,
    fromStatus: candidate.status,
    fromConsumerId: candidate.assignedConsumerId,
    resolvedAt,
  };
  const filter = {
    _id,
    assignedConsumerId: input.expectedConsumerId,
    status: candidate.status,
  };

  if (input.action === "release_not_printed") {
    return collection.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "pending",
          assignedConsumerId: null,
          assignedAt: null,
          deliveredAt: null,
          deliveryAttemptId: null,
          updatedAt: resolvedAt,
        },
        $push: { recoveryHistory: recoveryEntry },
      },
      { returnDocument: "after" },
    );
  }

  return collection.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "completed",
        completedAt: resolvedAt,
        updatedAt: resolvedAt,
      },
      $push: { recoveryHistory: recoveryEntry },
    },
    { returnDocument: "after" },
  );
}

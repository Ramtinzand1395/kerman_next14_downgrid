import { MongoClient } from "mongodb";

import {
  computeRetryDelayMs,
  sendGallerySyncRequest,
} from "../lib/gallery-sync.mjs";

const COLLECTION_NAME = "gallery_sync_jobs";
const POLL_INTERVAL_MS = 2_000;
const LOCK_LEASE_MS = 60_000;

const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  throw new Error("MONGODB_URI is not configured for the gallery sync worker.");
}

const client = new MongoClient(mongoUri);
let stopping = false;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function claimNextJob(collection) {
  const now = new Date();
  const expiredLock = new Date(now.getTime() - LOCK_LEASE_MS);

  return collection.findOneAndUpdate(
    {
      $or: [
        {
          status: { $in: ["pending", "retry"] },
          nextAttemptAt: { $lte: now },
        },
        { status: "processing", lockedAt: { $lte: expiredLock } },
      ],
    },
    { $set: { status: "processing", lockedAt: now, updatedAt: now } },
    { sort: { nextAttemptAt: 1, updatedAt: 1 }, returnDocument: "after" },
  );
}

async function markSucceeded(collection, job) {
  await collection.deleteOne({
    _id: job._id,
    revision: job.revision,
    status: "processing",
  });
}

async function markForRetry(collection, job, error) {
  const attempts = Number(job.attempts ?? 0) + 1;
  const delayMs = computeRetryDelayMs(attempts);
  const errorCode =
    typeof error?.code === "string" ? error.code.slice(0, 80) : "request_failed";

  await collection.updateOne(
    { _id: job._id, revision: job.revision, status: "processing" },
    {
      $set: {
        status: "retry",
        attempts,
        nextAttemptAt: new Date(Date.now() + delayMs),
        lockedAt: null,
        lastErrorCode: errorCode,
        updatedAt: new Date(),
      },
    },
  );

  console.error(
    `[gallery-sync] retry scheduled sourceId=${job.sourceId} attempt=${attempts} code=${errorCode}`,
  );
}

async function run() {
  await client.connect();
  const collection = client.db().collection(COLLECTION_NAME);
  await collection.createIndex({ sourceId: 1 }, { unique: true });
  await collection.createIndex({ status: 1, nextAttemptAt: 1 });

  console.log("[gallery-sync] worker started");

  while (!stopping) {
    const job = await claimNextJob(collection);
    if (!job) {
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    try {
      await sendGallerySyncRequest(job.payload);
      await markSucceeded(collection, job);
      console.log(
        `[gallery-sync] completed action=${job.action} sourceId=${job.sourceId}`,
      );
    } catch (error) {
      await markForRetry(collection, job, error);
    }
  }
}

async function stop() {
  if (stopping) return;
  stopping = true;
  await client.close();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

run()
  .catch((error) => {
    console.error(
      `[gallery-sync] worker stopped unexpectedly: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exitCode = 1;
  })
  .finally(() => client.close().catch(() => undefined));

import test from "node:test";
import assert from "node:assert/strict";
import { MongoClient, ObjectId } from "mongodb";

const enabled = process.env.PRINT_MONGO_INTEGRATION === "true";
const configuredUri = process.env.PRINT_TEST_MONGODB_URI || "";

function assertIsolatedMongoUri(value) {
  const parsed = new URL(value);
  const localHost = ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  const databaseName = parsed.pathname.slice(1);
  if (
    parsed.protocol !== "mongodb:" ||
    !localHost ||
    !/^[a-z0-9_-]+_test$/i.test(databaseName)
  ) {
    throw new Error(
      "PRINT_TEST_MONGODB_URI must target a localhost database ending in _test",
    );
  }
  return databaseName;
}

test(
  "isolated MongoDB atomically claims and explicitly recovers print jobs",
  { skip: !enabled },
  async () => {
    let memoryServer;
    let testUri = configuredUri;
    if (!testUri) {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: "print_queue_test" },
      });
      testUri = memoryServer.getUri("print_queue_test");
    }
    const databaseName = assertIsolatedMongoUri(testUri);
    const {
      acknowledgeOwnedPrintJob,
      claimPrintJobs,
      listPrintRecoveryCandidates,
      resolvePrintJobRecovery,
    } = await import("./lib/print/queue-store.ts");
    const client = new MongoClient(testUri);
    const collectionName = `print_queue_${process.pid}_${Date.now()}`;

    await client.connect();
    const collection = client.db(databaseName).collection(collectionName);
    try {
      const now = new Date();
      await collection.insertMany(
        Array.from({ length: 20 }, (_, index) => ({
          payload: { receiptType: "test", index },
          status: "pending",
          assignedConsumerId: null,
          createdAt: new Date(now.getTime() + index),
          updatedAt: now,
        })),
      );

      const [firstClaims, secondClaims] = await Promise.all([
        claimPrintJobs(collection, "printer:one", 20),
        claimPrintJobs(collection, "printer:two", 20),
      ]);
      const claimedIds = [...firstClaims, ...secondClaims].map((job) =>
        String(job._id),
      );
      assert.equal(claimedIds.length, 20);
      assert.equal(new Set(claimedIds).size, 20, "a job can have only one owner");
      assert.equal(
        await collection.countDocuments({ status: "delivered" }),
        20,
      );
      assert.equal(
        (await claimPrintJobs(collection, "printer:one", 20)).length,
        0,
        "delivered jobs are not automatically sent again",
      );

      const printedThenTimedOut = firstClaims[0] ?? secondClaims[0];
      const owner = firstClaims.some(
        (job) => String(job._id) === String(printedThenTimedOut._id),
      )
        ? "printer:one"
        : "printer:two";
      const firstAck = await acknowledgeOwnedPrintJob(
        collection,
        String(printedThenTimedOut._id),
        owner,
      );
      const retriedAck = await acknowledgeOwnedPrintJob(
        collection,
        String(printedThenTimedOut._id),
        owner,
      );
      assert.deepEqual(firstAck, {
        state: "completed",
        alreadyProcessed: false,
      });
      assert.deepEqual(retriedAck, {
        state: "completed",
        alreadyProcessed: true,
      });

      const legacyUnknownId = new ObjectId();
      await collection.insertOne({
        _id: legacyUnknownId,
        payload: { receiptType: "legacy-unknown" },
        status: "pending",
        assignedConsumerId: "printer:legacy-kerman-printer",
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      assert.equal(
        (await claimPrintJobs(collection, "printer:new-device", 100)).some(
          (job) => String(job._id) === String(legacyUnknownId),
        ),
        false,
        "an assigned legacy job with unknown physical state is quarantined",
      );
      assert.equal(
        (await listPrintRecoveryCandidates(collection, 100)).some(
          (job) => String(job._id) === String(legacyUnknownId),
        ),
        true,
      );

      const released = await resolvePrintJobRecovery(collection, {
        jobId: String(legacyUnknownId),
        expectedConsumerId: "printer:legacy-kerman-printer",
        action: "release_not_printed",
        reason: "Operator confirmed no paper was printed",
        actorUserId: "test-superadmin",
      });
      assert.equal(released?.status, "pending");
      assert.equal(released?.assignedConsumerId, null);
      assert.equal(released?.recoveryHistory?.length, 1);

      const recoveredClaims = await claimPrintJobs(
        collection,
        "printer:new-device",
        100,
      );
      assert.equal(
        recoveredClaims.some((job) => String(job._id) === String(legacyUnknownId)),
        true,
      );

      const staleRecovery = await resolvePrintJobRecovery(collection, {
        jobId: String(legacyUnknownId),
        expectedConsumerId: "printer:legacy-kerman-printer",
        action: "mark_printed",
        reason: "This stale owner must not overwrite the new claim",
        actorUserId: "test-superadmin",
      });
      assert.equal(staleRecovery, null);

      const confirmedPrintedId = new ObjectId();
      await collection.insertOne({
        _id: confirmedPrintedId,
        payload: { receiptType: "confirmed-printed" },
        status: "delivered",
        assignedConsumerId: "printer:one",
        deliveredAt: now,
        createdAt: now,
        updatedAt: now,
      });
      const markedPrinted = await resolvePrintJobRecovery(collection, {
        jobId: String(confirmedPrintedId),
        expectedConsumerId: "printer:one",
        action: "mark_printed",
        reason: "Operator confirmed the physical receipt exists",
        actorUserId: "test-superadmin",
      });
      assert.equal(markedPrinted?.status, "completed");
      assert.equal(markedPrinted?.recoveryHistory?.[0]?.action, "mark_printed");
    } finally {
      await collection.drop().catch(() => undefined);
      await client.close();
      await memoryServer?.stop();
    }
  },
);

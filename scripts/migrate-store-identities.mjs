import { parseArgs } from "node:util";
import { BSON, MongoClient } from "mongodb";
import { archiveCollection, planStoreIdentity } from "./store-identity-plan.mjs";

async function loadCollections(db, names, session) {
  const state = {};
  for (const name of names) {
    state[name] = await db.collection(name).find({}, { session }).toArray();
  }
  return state;
}

const encode = (value) => value === undefined
  ? undefined : BSON.EJSON.stringify({ value }, { relaxed: false });

function bulkOperations(edits) {
  return edits.map(({ before, after, id }) => {
    if (!before) return { insertOne: { document: after } };
    if (!after) return { deleteOne: { filter: { _id: id } } };
    const set = {};
    const unset = {};
    for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) unset[key] = "";
    for (const key of Object.keys(after)) if (key !== "_id" && encode(before[key]) !== encode(after[key])) {
      set[key] = after[key];
    }
    return { updateOne: {
      filter: { _id: id },
      update: {
        ...(Object.keys(set).length ? { $set: set } : {}),
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      },
    } };
  });
}

const options = {
  db: { type: "string" },
  host: { type: "string" },
  cleanup: { type: "boolean" },
  apply: { type: "boolean" },
  expect: { type: "string" },
};

async function run() {
  const { values: args } = parseArgs({ options });
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || !args.db) throw new Error("MONGODB_URI and --db are required.");
  if (args.apply && (!args.host || !/^[a-f\d]{64}$/.test(args.expect ?? ""))) {
    throw new Error("Apply requires --host and the digest from a fresh dry run via --expect.");
  }
  if (args.host && new URL(uri).hostname !== args.host) throw new Error("Configured MongoDB host differs from --host.");

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    const db = client.db(args.db);
    const names = (await db.listCollections({}, { nameOnly: true }).toArray())
      .filter(({ name, type }) => type !== "view" && !name.startsWith("system.") && name !== archiveCollection)
      .map(({ name }) => name).sort();
    if (!["users", "customers", "storeorders", "appointments"].every((name) => names.includes(name))) {
      throw new Error("Selected database does not contain the store identity collections.");
    }
    const plan = planStoreIdentity(await loadCollections(db, names), args);
    const result = { mode: args.apply ? "pre-apply" : "dry-run", db: db.databaseName,
      ...plan.summary, blockers: plan.blockers };
    console.log(JSON.stringify(result, null, 2));
    if (plan.blockers.length || (args.cleanup && Object.keys(plan.summary.brokenAfter).length)) {
      throw new Error("Resolve the reported relationships before applying.");
    }
    if (!args.apply) return;
    if (plan.summary.digest !== args.expect) throw new Error("Documents changed since the reviewed plan.");
    if (!plan.operations.length) return;
    const verifiedIndexes = await db.collection("users").listIndexes().toArray();
    if (!verifiedIndexes.some((index) => index.unique && index.key.mobile === 1 && Object.keys(index.key).length === 1)) {
      throw new Error("users.mobile must have a unique index.");
    }
    await db.collection("users").createIndex({ legacyCustomerId: 1 }, { unique: true, sparse: true });
    await db.collection("users").createIndex({ barcodes: 1 }, {
      unique: true, partialFilterExpression: { "barcodes.0": { $exists: true } },
    });
    await db.collection("storeorders").createIndex({ userId: 1 });
    if (!(await db.listCollections({ name: archiveCollection }, { nameOnly: true }).hasNext())) {
      await db.createCollection(archiveCollection);
    }

    await client.withSession(async (session) => {
      await session.withTransaction(async () => {
        const fresh = planStoreIdentity(await loadCollections(db, names, session), args);
        if (fresh.blockers.length || fresh.summary.digest !== args.expect) {
          throw new Error("The reviewed plan changed during the migration. Run a fresh dry run.");
        }
        const archive = fresh.operations.map((operation) => ({
          batch: args.expect,
          at: new Date(),
          collection: operation.collection,
          documentId: operation.id,
          reason: operation.reason,
          before: operation.before,
          after: operation.after,
        }));
        await db.collection(archiveCollection).insertMany(archive, { session });
        const groups = Map.groupBy(fresh.operations, ({ collection }) => collection);
        for (const [collection, operations] of groups) {
          const response = await db.collection(collection).bulkWrite(bulkOperations(operations), { session });
          if (response.matchedCount + response.insertedCount + response.deletedCount !== operations.length) {
            throw new Error("Unexpected write count in " + collection);
          }
        }
        const check = planStoreIdentity(await loadCollections(db, names, session), args);
        if (check.blockers.length || check.operations.length || (args.cleanup && Object.keys(check.summary.brokenAfter).length)) {
          throw new Error("Verification inside the transaction did not match the plan.");
        }
      }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
    });

    const check = planStoreIdentity(await loadCollections(db, names), args);
    const changedSinceCommit = check.operations.length > 0 || check.blockers.length > 0;
    console.log(JSON.stringify({
      mode: "committed", db: db.databaseName, batch: args.expect, changes: plan.operations.length,
      users: check.summary.usersBefore, brokenReferences: check.summary.brokenBefore,
      remainingOperations: check.operations.length, changedSinceCommit,
    }, null, 2));
    if (changedSinceCommit || (args.cleanup && Object.keys(check.summary.brokenBefore).length)) process.exitCode = 2;
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  // Driver failures can include entered data. Simulation failures use our own messages only.
  console.error(error.codeName ?? (error.constructor === Error ? error.message : error.name));
  process.exitCode = 1;
});

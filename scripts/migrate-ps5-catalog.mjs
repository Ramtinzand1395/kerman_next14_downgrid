import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MongoClient, ObjectId } from "mongodb";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "ps5-catalog-2026-10-31");
const REVIEW_PATH = path.join(ARTIFACT_DIR, "reviewed-catalog.json");
const mode = process.argv.includes("--apply")
  ? "apply"
  : process.argv.includes("--rollback")
    ? "rollback"
    : "dry-run";

const stable = (value) => {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
};

const hash = (value) =>
  createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const parseRollbackPath = () => {
  const index = process.argv.indexOf("--rollback");
  const supplied = index >= 0 ? process.argv[index + 1] : null;
  return path.resolve(supplied || path.join(ARTIFACT_DIR, "migration-last.json"));
};

const main = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  const reviewed = JSON.parse(await readFile(REVIEW_PATH, "utf8"));
  const client = new MongoClient(uri);
  await client.connect();

  try {
    const collection = client.db().collection("gamelists");
    const documentsBefore = await collection.find({}).sort({ platform: 1 }).toArray();
    const ps5 = documentsBefore.find((document) => document.platform === "ps5");
    if (!ps5) throw new Error('GameList document with platform "ps5" was not found');
    if (ps5.items.length !== reviewed.total || reviewed.total !== 148) {
      throw new Error(`Expected 148 PS5 items; found ${ps5.items.length}`);
    }

    const reviewedById = new Map(reviewed.items.map((item) => [item.id, item]));
    const ids = ps5.items.map((item) => item._id.toString());
    if (new Set(ids).size !== ids.length || ids.some((id) => !reviewedById.has(id))) {
      throw new Error("PS5 item identity/order no longer matches the reviewed catalog");
    }

    if (mode === "rollback") {
      const rollbackPath = parseRollbackPath();
      const migration = JSON.parse(await readFile(rollbackPath, "utf8"));
      if (migration.platform !== "ps5") throw new Error("Rollback file is not for ps5");

      let restoredFields = 0;
      let skippedFields = 0;
      for (const change of migration.changes) {
        const itemId = new ObjectId(change.id);
        for (const field of ["name", "imageUrl", "imagePublicId", "imageAlt"]) {
          if (!change.changedFields.includes(field)) continue;
          const currentPath = `items.${field}`;
          const itemPath = `items.$[target].${field}`;
          const filter = {
            platform: "ps5",
            items: { $elemMatch: { _id: itemId, [field]: change.after[field] } },
          };
          const update = change.beforePresence[field]
            ? { $set: { [itemPath]: change.before[field] } }
            : { $unset: { [itemPath]: "" } };
          const result = await collection.updateOne(filter, update, {
            arrayFilters: [{ "target._id": itemId }],
          });
          if (result.modifiedCount) restoredFields += 1;
          else skippedFields += 1;
        }
      }
      console.log(
        JSON.stringify({ mode, rollbackPath, restoredFields, skippedFields }, null, 2),
      );
      return;
    }

    const changes = [];
    const operations = [];
    for (const item of ps5.items) {
      const id = item._id.toString();
      const review = reviewedById.get(id);
      const intendedName = review.status === "confirmed" ? review.newName : item.name;
      if (
        review.status === "confirmed" &&
        item.name !== review.oldName &&
        item.name !== review.newName
      ) {
        throw new Error(`Unexpected concurrent name for ${id}: ${item.name}`);
      }

      const beforePresence = Object.fromEntries(
        ["name", "imageUrl", "imagePublicId", "imageAlt"].map((field) => [
          field,
          hasOwn(item, field),
        ]),
      );
      const before = {
        name: item.name,
        imageUrl: item.imageUrl,
        imagePublicId: item.imagePublicId,
        imageAlt: item.imageAlt,
      };
      const after = {
        name: intendedName,
        imageUrl: beforePresence.imageUrl ? item.imageUrl : null,
        imagePublicId: beforePresence.imagePublicId ? item.imagePublicId : null,
        imageAlt: beforePresence.imageAlt
          ? item.imageAlt
          : (intendedName || "").trim() || null,
      };
      const changedFields = ["name", "imageUrl", "imagePublicId", "imageAlt"].filter(
        (field) => !beforePresence[field] || before[field] !== after[field],
      );
      if (!changedFields.length) continue;

      const elemMatch = { _id: item._id, name: item.name };
      for (const field of changedFields) {
        if (!beforePresence[field]) elemMatch[field] = { $exists: false };
      }
      operations.push({
        updateOne: {
          filter: { platform: "ps5", items: { $elemMatch: elemMatch } },
          update: {
            $set: Object.fromEntries(
              changedFields.map((field) => [`items.$[target].${field}`, after[field]]),
            ),
          },
          arrayFilters: [{ "target._id": item._id }],
        },
      });
      changes.push({
        id,
        order: review.order,
        status: review.status,
        beforePresence,
        before,
        after,
        changedFields,
      });
    }

    const report = {
      generatedAt: new Date().toISOString(),
      mode,
      database: client.db().databaseName,
      collection: "gamelists",
      platform: "ps5",
      itemCount: ps5.items.length,
      changeCount: changes.length,
      renamedCount: changes.filter((change) => change.changedFields.includes("name"))
        .length,
      documentHashesBefore: Object.fromEntries(
        documentsBefore.map((document) => [document.platform, hash(document)]),
      ),
      changes,
    };

    if (mode === "dry-run") {
      console.log(
        JSON.stringify(
          {
            mode,
            database: report.database,
            platform: report.platform,
            itemCount: report.itemCount,
            changeCount: report.changeCount,
            renamedCount: report.renamedCount,
          },
          null,
          2,
        ),
      );
      return;
    }

    if (operations.length) {
      const result = await collection.bulkWrite(operations, { ordered: true });
      if (result.modifiedCount !== operations.length) {
        throw new Error(
          `Conditional migration stopped: ${result.modifiedCount}/${operations.length} items changed`,
        );
      }
    }

    const documentsAfter = await collection.find({}).sort({ platform: 1 }).toArray();
    const ps5After = documentsAfter.find((document) => document.platform === "ps5");
    const idsAfter = ps5After.items.map((item) => item._id.toString());
    if (hash(idsAfter) !== hash(ids)) throw new Error("PS5 item identity/order changed");
    for (const document of documentsBefore.filter((document) => document.platform !== "ps5")) {
      const after = documentsAfter.find((candidate) => candidate.platform === document.platform);
      if (!after || hash(after) !== hash(document)) {
        throw new Error(`Out-of-scope document changed: ${document.platform}`);
      }
    }

    report.documentHashesAfter = Object.fromEntries(
      documentsAfter.map((document) => [document.platform, hash(document)]),
    );
    report.appliedAt = new Date().toISOString();
    await mkdir(ARTIFACT_DIR, { recursive: true });
    const stamp = report.appliedAt.replace(/[:.]/g, "-");
    const migrationPath = path.join(ARTIFACT_DIR, `migration-${stamp}.json`);
    await writeFile(migrationPath, `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(
      path.join(ARTIFACT_DIR, "migration-last.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(
      JSON.stringify(
        {
          mode,
          database: report.database,
          itemCount: report.itemCount,
          changedItems: report.changeCount,
          renamedCount: report.renamedCount,
          migrationPath,
        },
        null,
        2,
      ),
    );
  } finally {
    await client.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

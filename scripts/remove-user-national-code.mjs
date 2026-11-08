import { MongoClient } from "mongodb";

// Dry run by default. Run again after deploying the profile/model changes so
// older running instances cannot reintroduce the retired field.
const uri = process.env.MONGODB_URI?.trim();
if (!uri) throw new Error("MONGODB_URI is required");
const args = process.argv.slice(2);
if (args.some((arg) => arg !== "--apply")) throw new Error("Only --apply is supported");
const client = new MongoClient(uri);
try {
  await client.connect();
  const database = client.db();
  const users = database.collection("users");
  const filter = { nationalCode: { $exists: true } };
  const before = await users.countDocuments(filter);
  const report = { database: database.databaseName, collection: "users", dryRun: !args.includes("--apply"), before };
  if (!report.dryRun) {
    const result = await users.updateMany(filter, { $unset: { nationalCode: "" } });
    report.modified = result.modifiedCount;
    report.remaining = await users.countDocuments(filter);
    if (report.remaining !== 0) process.exitCode = 1;
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await client.close();
}

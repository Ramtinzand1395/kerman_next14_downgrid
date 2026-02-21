import { MongoClient, ObjectId } from "mongodb";
import fs from "fs";
import path from "path";

const uri =
  "mongodb://myappuser:dhycj%24%253jjhds%25@127.0.0.1:27017/myapp?authSource=myapp";
const dbName = "myapp";

if (!uri || !dbName) {
  console.error("Missing MONGODB_URI or MONGODB_DBNAME in .env");
  process.exit(1);
}

// فایل -> کالکشن
const collectionsMap = {
  "test.gamelists.json": "gamelists",
};

const WIPE_BEFORE_INSERT = true;

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (raw.startsWith("[")) return JSON.parse(raw);

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

// تبدیل Extended JSON به ObjectId واقعی
function convertExtendedJson(value) {
  if (Array.isArray(value)) return value.map(convertExtendedJson);

  if (value && typeof value === "object") {
    // فقط { "$oid": "..." }
    if (Object.keys(value).length === 1 && typeof value.$oid === "string") {
      return new ObjectId(value.$oid);
    }

    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = convertExtendedJson(v);
    }
    return out;
  }

  return value;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const dataDir = path.join(process.cwd(), "data");

  for (const [fileName, collectionName] of Object.entries(collectionsMap)) {
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`Skipped: ${fileName} (not found)`);
      continue;
    }

    const docsRaw = readJsonFile(filePath);

    if (!Array.isArray(docsRaw) || docsRaw.length === 0) {
      console.warn(`Skipped: ${fileName} (empty or invalid JSON array)`);
      continue;
    }

    const docs = docsRaw.map(convertExtendedJson);

    const col = db.collection(collectionName);

    if (WIPE_BEFORE_INSERT) {
      await col.deleteMany({});
    }

    const res = await col.insertMany(docs, { ordered: false });
    console.log(`Imported ${res.insertedCount} docs into "${collectionName}"`);
  }

  await client.close();
  console.log("✅ Seed finished.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

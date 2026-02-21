import { MongoClient,ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const uri =
  "mongodb://myappuser:dhycj%24%253jjhds%25@127.0.0.1:27017/myapp?authSource=myapp";
const dbName = "myapp";

// ✅ مسیر پوشه‌ی همین فایل seed.mjs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ اگر دیتا کنار seed هست: helpers/data
// const dataDir = path.join(__dirname, "data");

// ✅ اگر دیتا اینجاست: app/helpers/data  (طبق حرف تو)
const dataDir = path.join(__dirname, "data");

const collectionsMap = {
  "test.gamelists.json": "gamelists",
 "test.customerorders.json": "storeorders",
  "test.customers.json": "customers",
};

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (raw.startsWith("[")) return JSON.parse(raw);

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function convertExtendedJson(value) {
  if (Array.isArray(value)) return value.map(convertExtendedJson);

  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && typeof value.$oid === "string") {
      return new ObjectId(value.$oid);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = convertExtendedJson(v);
    return out;
  }

  return value;
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  for (const [fileName, collectionName] of Object.entries(collectionsMap)) {
    const filePath = path.join(dataDir, fileName);

    // ✅ این خط رو بذار تا دقیقاً ببینی دنبال کجا می‌گرده
    console.log("Looking for:", filePath);

    if (!fs.existsSync(filePath)) {
      console.warn(`Skipped: ${fileName} (not found)`);
      continue;
    }

    const docsRaw = readJsonFile(filePath);
    const docs = docsRaw.map(convertExtendedJson);

    const col = db.collection(collectionName);
    await col.deleteMany({});
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

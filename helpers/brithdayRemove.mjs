import fs from "node:fs";
import path from "node:path";

const INPUT = path.resolve(process.cwd(), "helpers/data/test.customers.json");
const OUTPUT = path.resolve(process.cwd(), "helpers/data/test.customers.fixed.json");

function genFiveDigit() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function isNdjson(text) {
  return !text.trimStart().startsWith("[");
}

function parseInput(raw) {
  if (isNdjson(raw)) {
    const docs = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    return { docs, ndjson: true };
  }

  const docs = JSON.parse(raw);
  if (!Array.isArray(docs)) throw new Error("Expected JSON array in input file.");
  return { docs, ndjson: false };
}

function hasDeliveryCode(d) {
  if (!d || typeof d !== "object") return false;
  if (!("deliveryCode" in d)) return false;
  const v = d.deliveryCode;
  if (v === null || v === undefined) return false;
  if (String(v).trim() === "") return false;
  return true;
}

// حذف persianDate / persiandate با هر Case
function removePersianDateFields(d) {
  if (!d || typeof d !== "object") return false;

  let removed = false;
  for (const key of Object.keys(d)) {
    const k = key.toLowerCase();
    if (k === "persiandate" || k === "persiandate" /* redundant but explicit */) {
      delete d[key];
      removed = true;
    }
    if (k === "persiandate") {
      // already handled
    }
    if (k === "persiandate") {
      // already handled
    }
    // کلید persianDate هم بعد از lowerCase میشه persiandate
    if (k === "persiandate") {
      // already handled
    }
  }
  return removed;
}

// ✅ حذف birthday از رکورد
function removeBirthdayField(d) {
  if (!d || typeof d !== "object") return false;
  if ("birthday" in d) {
    delete d.birthday;
    return true;
  }
  return false;
}

// --- main ---
const raw = fs.readFileSync(INPUT, "utf-8");
const { docs, ndjson } = parseInput(raw);

// جمع کردن deliveryCode های موجود
const used = new Set();
for (const d of docs) {
  if (hasDeliveryCode(d)) used.add(String(d.deliveryCode));
}

let removedPersianDate = 0;
let removedBirthday = 0;
let addedDeliveryCode = 0;

for (const d of docs) {
  if (!d || typeof d !== "object") continue;

  // حذف persianDate / persiandate
  const removedPD = removePersianDateFields(d);
  if (removedPD) removedPersianDate++;

  // ✅ حذف birthday
  const removedBD = removeBirthdayField(d);
  if (removedBD) removedBirthday++;

  // افزودن deliveryCode یونیک 5 رقمی اگر ندارد
  if (!hasDeliveryCode(d)) {
    let code = genFiveDigit();
    while (used.has(code)) code = genFiveDigit();

    d.deliveryCode = code;
    used.add(code);
    addedDeliveryCode++;
  } else {
    used.add(String(d.deliveryCode));
  }
}

// ذخیره خروجی
if (ndjson) {
  const out = docs.map((d) => JSON.stringify(d)).join("\n") + "\n";
  fs.writeFileSync(OUTPUT, out, "utf-8");
} else {
  fs.writeFileSync(OUTPUT, JSON.stringify(docs, null, 2), "utf-8");
}

console.log("✅ Done");
console.log("Docs:", docs.length);
console.log("Removed persianDate/persiandate:", removedPersianDate);
console.log("Removed birthday:", removedBirthday);
console.log("Added deliveryCode:", addedDeliveryCode);
console.log("Unique deliveryCodes:", used.size);
console.log("Output:", OUTPUT);
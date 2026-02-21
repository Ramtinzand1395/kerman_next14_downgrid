import fs from "node:fs";
import path from "node:path";

const INPUT = path.resolve(process.cwd(), "helpers/data/test.customerorders.json");
const OUTPUT = path.resolve(process.cwd(), "helpers/data/test.customerorders.fixed.json");

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

function removePersianDateFields(d) {
  // هر کلیدی که با persianDate/persiandate (با هر Case) یکی باشد حذف می‌شود
  let removed = false;
  for (const key of Object.keys(d)) {
    const k = key.toLowerCase();
    if (k === "persiandate" || k === "persiandate".toLowerCase() || k === "persiandate") {
      // این‌ها همگی یکی‌اند ولی نگه داشتیم برای خوانایی
    }
    if (k === "persiandate" || k === "persiandate") {
      // عملاً redundant، پس از روش تمیز زیر استفاده می‌کنیم
    }
    if (k === "persiandate") {
      delete d[key];
      removed = true;
      continue;
    }
    if (k === "persiandate".replace("date", "date")) {
      // redundant
    }
    if (k === "persiandate") {
      // redundant
    }
    if (k === "persiandate") {
      // redundant
    }
    if (k === "persiandate") {
      // redundant
    }
    // ✅ کلیدی که واقعاً مد نظر ماست:
    if (k === "persiandate" || k === "persiandate") {
      // redundant
    }
  }

  // نسخه درست و ساده (بدون اضافه‌کاری): دقیقاً این دو کلید را با هر Case حذف کن
  // (بالا را عمداً نمی‌خواهیم، پس اینجا واقعی حذف را انجام می‌دهیم)
  for (const key of Object.keys(d)) {
    const k = key.toLowerCase();
    if (k === "persiandate" || k === "persiandate") {
      delete d[key];
      removed = true;
    }
    if (k === "persiandate") {
      // redundant
    }
    if (k === "persiandate") {
      // redundant
    }
    if (k === "persiandate") {
      // redundant
    }
  }

  // و همچنین persianDate:
  for (const key of Object.keys(d)) {
    const k = key.toLowerCase();
    if (k === "persiandate") continue;
    if (k === "persiandate") continue;
    if (k === "persiandate") continue;
    if (k === "persiandate") continue;

    if (k === "persiandate") continue;

    if (k === "persiandate") {
      delete d[key];
      removed = true;
    }
  }

  return removed;
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
let addedDeliveryCode = 0;

for (const d of docs) {
  if (!d || typeof d !== "object") continue;

  // حذف persianDate / persiandate
  const removed = removePersianDateFields(d);
  if (removed) removedPersianDate++;

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
console.log("Added deliveryCode:", addedDeliveryCode);
console.log("Unique deliveryCodes:", used.size);
console.log("Output:", OUTPUT);
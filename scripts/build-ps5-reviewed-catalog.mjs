import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const outputDirectory = path.resolve(
  process.cwd(),
  process.env.PS5_CATALOG_OUTPUT || "artifacts/ps5-catalog-2026-10-31",
);
const discovery = JSON.parse(
  await readFile(path.join(outputDirectory, "discovery.json"), "utf8"),
);

const MANUAL_SELECTIONS = new Map([
  [2, "A Plague Tale: Requiem"],
  [3, "Alan Wake Remastered"],
  [4, "Alan Wake 2"],
  [5, "Assassin’s Creed Shadows"],
  [14, "Call of Duty®: Black Ops 6 - Cross-Gen Bundle"],
  [15, "Call of Duty®: Modern Warfare® III - Cross-Gen Bundle"],
  [16, "Call of Duty®: Vanguard - Cross-Gen Bundle"],
  [17, "Call of Duty®: Black Ops Cold War - Cross-Gen Bundle PS4® & PS5®"],
  [18, "Call of Duty®: Modern Warfare® II - Cross-Gen Bundle"],
  [21, "Crimson Desert Enhanced"],
  [26, "Dead Space"],
  [27, "DEATH STRANDING 2: ON THE BEACH"],
  [30, "Demon's Souls"],
  [32, "DIRT 5 PS4 & PS5"],
  [33, "DOOM Eternal Standard Edition"],
  [35, "Dragon Age™: The Veilguard"],
  [37, "Dying Light 2 Stay Human PS4&PS5"],
  [39, "EA SPORTS FC™ 26 Standard Edition PS4 & PS5"],
  [40, "eFootball™"],
  [41, "ELDEN RING PS4 & PS5"],
  [42, "ELDEN RING NIGHTREIGN PS4 & PS5"],
  [49, "Forza Horizon 5 Standard Edition"],
  [51, "Ghost of Tsushima DIRECTOR’S CUT"],
  [56, "Grand Theft Auto: The Trilogy – The Definitive Edition (PS5 & PS4)"],
  [57, "Grand Theft Auto V (PS4™ & PS5™)"],
  [60, "HITMAN World of Assassination"],
  [61, "Hogwarts Legacy PS5 Version"],
  [63, "Horizon Forbidden West™"],
  [65, "INSIDE"],
  [66, "It Takes Two PS4™ & PS5™"],
  [69, "Kena: Bridge of Spirits PS4 & PS5"],
  [71, "LEGO® 2K Drive"],
  [73, "Little Nightmares II PS4 & PS5"],
  [74, "Little Nightmares III PS4 & PS5"],
  [77, "Marvel’s Spider-Man 2"],
  [79, "Marvel's Guardians of the Galaxy PS4 & PS5"],
  [80, "Marvel's Spider-Man: Miles Morales PS4 & PS5"],
  [87, "Mortal Kombat™ 1"],
  [89, "Mount & Blade II: Bannerlord"],
  [91, "NBA 2K26 for PS5®"],
  [95, "No Man's Sky PS4 & PS5"],
  [101, "RESIDENT EVIL 7 biohazard"],
  [107, "Riders Republic™ PS4 & PS5"],
  [109, "Sackboy: A Big Adventure PS4 & PS5"],
  [111, "SHINOBI: Art of Vengeance PS4 & PS5"],
  [114, "Sniper Elite 5 PS4™ & PS5™"],
  [115, "Sniper Elite: Resistance PS4™ & PS5™"],
  [117, "Sonic Frontiers PS4 & PS5"],
  [118, "Sonic Origins PS4 & PS5"],
  [120, "SONIC X SHADOW GENERATIONS PS4 & PS5"],
  [121, "Nickelodeon All-Star Brawl"],
  [124, "STAR WARS Jedi: Fallen Order™"],
  [125, "STAR WARS Jedi: Survivor™"],
  [127, "Stellar Blade™"],
  [129, "Street Fighter™ 6"],
  [134, "The Last of Us™ Part I"],
  [135, "The Last of Us™ Part II Remastered"],
  [139, "UNCHARTED: Legacy of Thieves Collection"],
  [140, "Warhammer 40,000: Space Marine 2"],
  [142, "WRC 10 FIA World Rally Championship"],
  [143, "WUCHANG: Fallen Feathers"],
  [144, "WWE 2K25 Standard Edition"],
  [145, "WWE 2K26 Standard Edition"],
  [147, "Assassin's Creed Black Flag Resynced"],
]);

const MANUAL_REVIEW = new Map([
  [12, "عنوان «Ben 10» مشخص نمی‌کند منظور بازی ۲۰۱۷ است یا Ben 10: Power Trip."],
  [52, "فروشگاه فعلی فقط Complete Edition را برمی‌گرداند؛ نسخهٔ رکورد موجود مشخص نیست."],
  [72, "عنوان «LEGO Star Wars» برای تشخیص قسمت بازی کافی نیست."],
  [78, "Marvel's Avengers از فروش خارج شده و نتیجهٔ رسمی قابل اتکای همان محصول پیدا نشد."],
  [96, "عنوان «Overcooked» بین نسخهٔ اصلی PS4 و All You Can Eat مبهم است."],
  [97, "عنوان «Ratchet & Clank» بین Size Matters و Rift Apart مبهم است."],
  [103, "فروشگاه فقط Gold Edition را برمی‌گرداند و Edition رکورد فعلی مشخص نیست."],
  [123, "عنوان «SpongeBob SquarePants» قسمت مشخصی از مجموعه را تعیین نمی‌کند."],
  [131, "عنوان «Teenage Mutant Ninja Turtles» قسمت مشخصی از مجموعه را تعیین نمی‌کند."],
  [137, "عنوان «Truck Driver» بین Gold Edition و The American Dream مبهم است."],
  [141, "نسخهٔ پایهٔ Watch Dogs: Legion در نتایج فعلی نیست؛ DLC/Edition حدس زده نمی‌شود."],
  [146, "نام رکورد خالی است و بدون حذف یا ادغام برای بررسی دستی نگه داشته شد."],
]);

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const inferEdition = (name) => {
  const match = name.match(
    /\b(Standard Edition|Digital Deluxe Edition|Deluxe Edition|Ultimate Edition|Complete Edition|Gold Edition|Remastered|Remake|Director[’']s Cut)\b/i,
  );
  return match?.[0] || "Standard/unspecified";
};

const selectCandidate = (match) => {
  const requestedName = MANUAL_SELECTIONS.get(match.order);
  const candidates = (match.candidates || []).filter(
    (candidate) => candidate.officialName && candidate.sourceUrl && candidate.imageUrl,
  );
  if (requestedName) {
    return candidates.find(
      (candidate) => normalize(candidate.officialName) === normalize(requestedName),
    );
  }
  if (match.status === "matched") {
    return candidates.find(
      (candidate) => normalize(candidate.officialName) === normalize(match.officialName),
    );
  }
  return null;
};

const reviewed = [];
for (const match of discovery.matches) {
  const manualReason = MANUAL_REVIEW.get(match.order);
  if (manualReason) {
    reviewed.push({
      id: match.id,
      order: match.order,
      oldName: match.oldName,
      newName: match.oldName,
      platform: "Needs manual review",
      edition: "Unknown",
      sourceUrl: null,
      imageUrl: null,
      imageRole: null,
      status: "manual-review",
      notes: manualReason,
    });
    continue;
  }

  const candidate = selectCandidate(match);
  if (!candidate) {
    throw new Error(
      `Reviewed candidate is missing for order ${match.order}: ${match.oldName}`,
    );
  }
  const platforms = candidate.platforms || [];
  const platform = platforms.length
    ? platforms.join(", ")
    : candidate.productId?.includes("PPSA")
      ? "PS5"
      : "Platform not exposed by Store payload";
  reviewed.push({
    id: match.id,
    order: match.order,
    oldName: match.oldName,
    newName: candidate.officialName,
    platform,
    edition: inferEdition(candidate.officialName),
    sourceUrl: candidate.sourceUrl,
    imageUrl: candidate.imageUrl,
    imageRole: candidate.imageRole,
    productId: candidate.productId,
    conceptId: candidate.conceptId || null,
    status: "confirmed",
    notes:
      platform === "PS4"
        ? "PS4-only Store product; retained in the existing ps5 category for compatibility."
        : "Matched to the official PlayStation Store product.",
  });
}

if (reviewed.length !== discovery.total) {
  throw new Error(`Expected ${discovery.total} reviewed rows, received ${reviewed.length}`);
}

const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const csvColumns = [
  "id",
  "order",
  "oldName",
  "newName",
  "platform",
  "edition",
  "sourceUrl",
  "imageUrl",
  "status",
  "notes",
];
const csv = [
  csvColumns.join(","),
  ...reviewed.map((row) => csvColumns.map((column) => csvValue(row[column])).join(",")),
].join("\n");

const manualReview = reviewed.filter((row) => row.status === "manual-review");
const report = {
  generatedAt: new Date().toISOString(),
  database: discovery.database,
  collection: discovery.collection,
  platform: discovery.platform,
  total: reviewed.length,
  confirmed: reviewed.length - manualReview.length,
  manualReview: manualReview.length,
  renamed: reviewed.filter(
    (row) => row.status === "confirmed" && normalize(row.oldName) !== normalize(row.newName),
  ).length,
  items: reviewed,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(
  path.join(outputDirectory, "reviewed-catalog.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
await writeFile(path.join(outputDirectory, "name-corrections.csv"), `${csv}\n`, "utf8");
await writeFile(
  path.join(outputDirectory, "manual-review.txt"),
  `${manualReview
    .map((row) => `${row.order}\t${row.id}\t${row.oldName || "<empty>"}\t${row.notes}`)
    .join("\n")}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      total: report.total,
      confirmed: report.confirmed,
      manualReview: report.manualReview,
      renamed: report.renamed,
    },
    null,
    2,
  ),
);

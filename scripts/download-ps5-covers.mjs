import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const outputDirectory = path.resolve(
  process.cwd(),
  process.env.PS5_CATALOG_OUTPUT || "artifacts/ps5-catalog-2026-10-31",
);
const coversDirectory = path.join(outputDirectory, "covers");
const manifestPath = path.join(outputDirectory, "manifest.json");
const failuresPath = path.join(outputDirectory, "failed-downloads.txt");
const reviewed = JSON.parse(
  await readFile(path.join(outputDirectory, "reviewed-catalog.json"), "utf8"),
);

const REQUEST_DELAY_MS = Number(process.env.PS5_COVER_DELAY_MS || 250);
const MAX_ATTEMPTS = 4;
const MAX_LONG_EDGE = 1_000;
const TARGET_MIN_BYTES = 60 * 1024;
const TARGET_MAX_BYTES = 150 * 1024;

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const slugify = (value) =>
  String(value || "game")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "game";

const fetchWithRetry = async (url) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
          referer: "https://store.playstation.com/",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36",
        },
        signal: AbortSignal.timeout(45_000),
      });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      lastError = new Error(`HTTP ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(800 * 2 ** (attempt - 1));
  }
  throw lastError || new Error("Image download failed");
};

const encodeWebp = async (source) => {
  const pipeline = sharp(source, { failOn: "warning" })
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
  let quality = 82;
  let output = await pipeline
    .clone()
    .webp({ quality, effort: 6, smartSubsample: true })
    .toBuffer();

  while (output.length > TARGET_MAX_BYTES && quality > 54) {
    quality -= 4;
    output = await pipeline
      .clone()
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();
  }
  while (output.length < TARGET_MIN_BYTES && quality < 90) {
    quality += 4;
    output = await pipeline
      .clone()
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();
  }
  return { output, quality };
};

const verifyWebp = async (filePath) => {
  const info = await stat(filePath);
  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer, { failOn: "warning" }).metadata();
  if (
    metadata.format !== "webp" ||
    !metadata.width ||
    !metadata.height ||
    Math.max(metadata.width, metadata.height) > MAX_LONG_EDGE
  ) {
    throw new Error(
      `Invalid WebP (${metadata.format}, ${metadata.width}x${metadata.height})`,
    );
  }
  return {
    bytes: info.size,
    width: metadata.width,
    height: metadata.height,
    sha256: sha256(buffer),
  };
};

await mkdir(coversDirectory, { recursive: true });
const existingManifest = await readFile(manifestPath, "utf8")
  .then((value) => JSON.parse(value))
  .catch(() => ({ items: [] }));
const completed = new Map(existingManifest.items.map((item) => [item.id, item]));
const failures = [];
const confirmed = reviewed.items.filter((item) => item.status === "confirmed");

for (const [index, item] of confirmed.entries()) {
  const filename = `${item.id}-${slugify(item.newName)}.webp`;
  const filePath = path.join(coversDirectory, filename);
  try {
    let verification;
    let quality = completed.get(item.id)?.quality || 82;
    if (completed.get(item.id)?.filename === filename) {
      verification = await verifyWebp(filePath);
    }
    if (!verification || verification.bytes > TARGET_MAX_BYTES) {
      const source = await fetchWithRetry(item.imageUrl);
      const encoded = await encodeWebp(source);
      quality = encoded.quality;
      await writeFile(filePath, encoded.output);
      verification = await verifyWebp(filePath);
    }
    completed.set(item.id, {
      id: item.id,
      order: item.order,
      filename,
      officialName: item.newName,
      platform: item.platform,
      edition: item.edition,
      sourcePageUrl: item.sourceUrl,
      sourceImageUrl: item.imageUrl,
      imageRole: item.imageRole,
      quality,
      ...verification,
    });
    console.log(
      `[${index + 1}/${confirmed.length}] ${filename} ${verification.width}x${verification.height} ${Math.round(verification.bytes / 1024)}KB`,
    );
  } catch (error) {
    failures.push({
      id: item.id,
      order: item.order,
      name: item.newName,
      sourcePageUrl: item.sourceUrl,
      sourceImageUrl: item.imageUrl,
      error: error.message,
    });
    console.error(`[${index + 1}/${confirmed.length}] FAILED ${item.newName}: ${error.message}`);
  }
  const manifest = {
    generatedAt: new Date().toISOString(),
    expected: confirmed.length,
    successful: completed.size,
    failed: failures.length,
    constraints: {
      format: "WebP",
      maxLongEdge: MAX_LONG_EDGE,
      targetBytes: [TARGET_MIN_BYTES, TARGET_MAX_BYTES],
      initialQuality: 82,
      fit: "inside",
      enlargement: false,
    },
    items: [...completed.values()].sort((left, right) => left.order - right.order),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(
    failuresPath,
    failures.length
      ? `${failures.map((failure) => JSON.stringify(failure)).join("\n")}\n`
      : "No failed downloads.\n",
    "utf8",
  );
  await sleep(REQUEST_DELAY_MS);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const verified = [];
for (const item of manifest.items) {
  verified.push(await verifyWebp(path.join(coversDirectory, item.filename)));
}

console.log(
  JSON.stringify(
    {
      expected: confirmed.length,
      successful: verified.length,
      failed: failures.length,
      withinTargetRange: verified.filter(
        (item) => item.bytes >= TARGET_MIN_BYTES && item.bytes <= TARGET_MAX_BYTES,
      ).length,
      belowTargetRange: verified.filter((item) => item.bytes < TARGET_MIN_BYTES).length,
      aboveTargetRange: verified.filter((item) => item.bytes > TARGET_MAX_BYTES).length,
    },
    null,
    2,
  ),
);

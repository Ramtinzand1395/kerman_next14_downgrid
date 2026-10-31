import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MongoClient } from "mongodb";

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  process.env.PS5_CATALOG_OUTPUT || "artifacts/ps5-catalog-2026-10-31",
);
const SNAPSHOT_PATH = path.join(OUTPUT_DIR, "backup", "gamelists-before.json");
const DISCOVERY_PATH = path.join(OUTPUT_DIR, "discovery.json");
const REQUEST_DELAY_MS = Number(process.env.PS5_CATALOG_DELAY_MS || 1_250);
const MAX_ATTEMPTS = 4;
const ITEM_LIMIT = Math.max(Number(process.env.PS5_CATALOG_LIMIT || 0), 0);
const ITEM_REFRESH = new Set(
  String(process.env.PS5_CATALOG_REFRESH || "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter(Number.isInteger),
);
const SEARCH_OVERRIDES = new Map([
  [2, "A Plague Tale Requiem"],
  [4, "Alan Wake 2"],
  [26, "Dead Space"],
  [42, "Elden Ring Nightreign"],
  [57, "Grand Theft Auto V"],
  [63, "Horizon Forbidden West"],
  [65, "INSIDE"],
  [71, "LEGO 2K Drive"],
  [73, "Little Nightmares II"],
  [77, "Marvel's Spider-Man 2"],
  [89, "Mount & Blade II Bannerlord"],
  [95, "No Man's Sky"],
  [109, "Sackboy A Big Adventure"],
  [115, "Sniper Elite Resistance"],
  [120, "Sonic X Shadow Generations"],
  [134, "The Last of Us Part I"],
  [135, "The Last of Us Part II Remastered"],
  [139, "UNCHARTED Legacy of Thieves Collection"],
]);
const DIRECT_SOURCE_OVERRIDES = new Map([
  [71, ["https://store.playstation.com/en-us/concept/10003091"]],
  [109, ["https://store.playstation.com/en-us/product/UP9000-PPSA01289_00-SACKBOYADVENTURE"]],
  [115, ["https://store.playstation.com/en-us/product/UP4363-PPSA17232_00-SNIPERELITERES00"]],
]);
const PLAYSTATION_SEARCH_HASH =
  "4df6284f982e57bec70f23c77e2c219dc792eb19af7fb3d3a81767aa3f1958aa";

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const sha256 = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const normalizeTitle = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b1\.\d+(?:\.\d+)*\b/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

const comparableTokens = (value) =>
  new Set(
    normalizeTitle(value)
      .split(/\s+/)
      .filter((token) => token && !["the", "a", "edition", "game"].includes(token)),
  );

const similarity = (left, right) => {
  const a = comparableTokens(left);
  const b = comparableTokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(a.size, b.size);
  return Number((jaccard * 0.55 + containment * 0.45).toFixed(4));
};

const fetchWithRetry = async (url, options = {}) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "accept-language": "en-US,en;q=0.9",
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141 Safari/537.36",
          ...options.headers,
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) return response;
      if (![429, 500, 502, 503, 504].includes(response.status)) {
        const details = (await response.text()).slice(0, 1_000);
        throw new Error(`HTTP ${response.status} for ${url}: ${details}`);
      }
      lastError = new Error(`HTTP ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(750 * 2 ** (attempt - 1));
  }
  throw lastError;
};

const decodeHtml = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");

const searchOfficialPages = async (title) => {
  const url = new URL("https://web.np.playstation.com/api/graphql/v1//op");
  url.searchParams.set("operationName", "getSearchResults");
  url.searchParams.set(
    "variables",
    JSON.stringify({
      countryCode: "US",
      languageCode: "en",
      nextCursor: "",
      pageOffset: 0,
      pageSize: 24,
      searchTerm: title.trim(),
    }),
  );
  url.searchParams.set(
    "extensions",
    JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: PLAYSTATION_SEARCH_HASH },
    }),
  );
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        accept: "application/json",
        "apollo-require-preflight": "true",
        origin: "https://store.playstation.com",
        referer: "https://store.playstation.com/",
      },
    },
  );
  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`PlayStation search failed: ${payload.errors[0].message}`);
  }
  const productIds = [];
  for (const result of payload.data?.universalSearch?.results || []) {
    if (result.__typename === "Product" && result.id) productIds.push(result.id);
    if (result.__typename === "Concept") {
      for (const product of result.products || []) {
        if (product.id) productIds.push(product.id);
      }
    }
  }
  return [...new Set(productIds)]
    .slice(0, 12)
    .map((productId) => `https://store.playstation.com/en-us/product/${productId}`);
};

const walk = (value, visit) => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (!value || typeof value !== "object") return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
};

const parseEmbeddedEnvironments = (nextData) => {
  const environments = [];
  walk(nextData, (object) => {
    for (const value of Object.values(object)) {
      if (typeof value !== "string" || !value.includes('<script id="env:')) continue;
      const match = value.match(/<script[^>]*>(\{.*\})<\/script>/s);
      if (!match) continue;
      try {
        environments.push(JSON.parse(match[1]));
      } catch {
        // A single optional batarang payload must not invalidate the product page.
      }
    }
  });
  return environments;
};

const pickPlatforms = (roots, productId, html) => {
  const platforms = new Set();
  for (const root of roots) {
    walk(root, (object) => {
      if (
        object.id !== productId &&
        object.productId !== productId &&
        object.__typename !== "Product"
      ) {
        return;
      }
      for (const [key, value] of Object.entries(object)) {
        if (!/platform/i.test(key)) continue;
        for (const candidate of Array.isArray(value) ? value : [value]) {
          if (typeof candidate === "string" && /PS[45]/i.test(candidate)) {
            for (const platform of candidate.match(/PS[45]/gi) || []) {
              platforms.add(platform.toUpperCase());
            }
          }
        }
      }
    });
  }
  const textMatch = html.match(/Platform:\s*<[^>]+>\s*(PS4|PS5)/i);
  if (textMatch) platforms.add(textMatch[1].toUpperCase());
  return [...platforms];
};

const parseProductPage = async (sourceUrl) => {
  const response = await fetchWithRetry(sourceUrl, { headers: { accept: "text/html" } });
  const finalUrl = response.url.replace(/[?#].*$/, "");
  const html = await response.text();
  const nextMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s,
  );
  if (!nextMatch) throw new Error("PlayStation Store page has no __NEXT_DATA__ payload");
  const nextData = JSON.parse(nextMatch[1]);
  const productId = nextData?.props?.pageProps?.productId || finalUrl.split("/").at(-1);
  const conceptId =
    nextData?.props?.pageProps?.conceptId ||
    (finalUrl.includes("/concept/") ? finalUrl.split("/").at(-1) : null);
  const roots = [nextData, ...parseEmbeddedEnvironments(nextData)];
  const names = [];
  const media = [];
  for (const root of roots) {
    walk(root, (object) => {
      if (
        object.__typename === "Product" &&
        (!productId || object.id === productId) &&
        typeof object.name === "string"
      ) {
        names.push(object.name.trim());
      }
      if (
        object.__typename === "Concept" &&
        conceptId &&
        object.id === conceptId &&
        typeof object.name === "string"
      ) {
        names.push(object.name.trim());
      }
      if (
        object.__typename === "Media" &&
        object.type === "IMAGE" &&
        typeof object.url === "string"
      ) {
        media.push({ role: object.role, url: object.url });
      }
    });
  }
  const pageTitle = decodeHtml(
    html.match(/<meta name="description"[^>]*>/)?.[0] || "",
  );
  const officialName = names.find(Boolean);
  const primaryImage =
    media.find((item) => item.role === "MASTER") ||
    media.find((item) => item.role === "GAMEHUB_COVER_ART") ||
    media.find((item) => item.role === "PORTRAIT_BANNER");
  return {
    productId,
    conceptId,
    officialName: officialName || null,
    platforms: pickPlatforms(roots, productId, html),
    sourceUrl: finalUrl,
    imageUrl: primaryImage?.url || null,
    imageRole: primaryImage?.role || null,
    pageFingerprint: sha256({ productId, officialName, finalUrl, pageTitle }),
  };
};

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
};

const snapshotDatabase = async () => {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is required");
  const client = new MongoClient(uri);
  await client.connect();
  try {
    const database = client.db();
    const documents = await database
      .collection("gamelists")
      .find({}, { projection: { platform: 1, items: 1, createdAt: 1, updatedAt: 1 } })
      .sort({ platform: 1 })
      .toArray();
    const serialized = documents.map((document) => ({
      ...document,
      _id: String(document._id),
      items: (document.items || []).map((item, order) => ({
        ...item,
        _id: String(item._id),
        order,
      })),
    }));
    const snapshot = {
      capturedAt: new Date().toISOString(),
      database: database.databaseName,
      collection: "gamelists",
      documents: serialized,
      scope: serialized.map((document) => ({
        platform: document.platform,
        documentId: document._id,
        count: document.items.length,
        itemIdsHash: sha256(document.items.map((item) => item._id)),
        itemOrderHash: sha256(document.items.map((item) => [item._id, item.order])),
        documentHash: sha256(document),
      })),
    };
    await mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    return snapshot;
  } finally {
    await client.close();
  }
};

const discover = async (snapshot) => {
  const ps5 = snapshot.documents.find((document) => document.platform === "ps5");
  if (!ps5) throw new Error("The ps5 document was not found in gamelists");
  const output = await readJson(DISCOVERY_PATH, {
    generatedAt: null,
    database: snapshot.database,
    collection: snapshot.collection,
    platform: "ps5",
    total: ps5.items.length,
    matches: [],
  });
  const existing = new Map(output.matches.map((item) => [item.id, item]));
  const scopedItems = ITEM_LIMIT ? ps5.items.slice(0, ITEM_LIMIT) : ps5.items;
  for (const item of scopedItems) {
    if (existing.has(item._id) && !ITEM_REFRESH.has(item.order)) continue;
    const result = {
      id: item._id,
      order: item.order,
      oldName: item.name,
      status: "unmatched",
      candidates: [],
      error: null,
    };
    try {
      const links =
        DIRECT_SOURCE_OVERRIDES.get(item.order) ||
        (await searchOfficialPages(SEARCH_OVERRIDES.get(item.order) || item.name));
      for (const link of links) {
        try {
          const candidate = await parseProductPage(link);
          candidate.score = similarity(item.name, candidate.officialName);
          result.candidates.push(candidate);
        } catch (error) {
          result.candidates.push({ sourceUrl: link, error: error.message });
        }
        await sleep(Math.min(REQUEST_DELAY_MS, 700));
      }
      result.candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
      const best = result.candidates[0];
      if (
        best?.officialName &&
        best?.imageUrl &&
        best.score >= 0.82 &&
        (best.platforms.includes("PS5") || best.productId?.includes("PPSA"))
      ) {
        result.status = "matched";
        result.officialName = best.officialName;
        result.platform = best.platforms.includes("PS5") ? "PS5" : "PS5 (PPSA product)";
        result.edition = /\b(deluxe|ultimate|complete|remaster(?:ed)?|remake|director'?s cut|edition)\b/i.exec(
          best.officialName,
        )?.[0] || "Standard/unspecified";
        result.sourceUrl = best.sourceUrl;
        result.imageUrl = best.imageUrl;
        result.imageRole = best.imageRole;
        result.score = best.score;
      }
    } catch (error) {
      result.error = error.message;
    }
    existing.set(item._id, result);
    output.matches = [...existing.values()].sort((a, b) => a.order - b.order);
    output.generatedAt = new Date().toISOString();
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(DISCOVERY_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(
      `[${item.order + 1}/${ps5.items.length}] ${item.name} -> ${result.officialName || result.status}`,
    );
    await sleep(REQUEST_DELAY_MS);
  }
  return output;
};

await mkdir(OUTPUT_DIR, { recursive: true });
const snapshot = await snapshotDatabase();
const ps5Scope = snapshot.scope.find((item) => item.platform === "ps5");
console.log(
  `Snapshot: ${snapshot.database}.${snapshot.collection}, ps5=${ps5Scope?.count || 0}, ${SNAPSHOT_PATH}`,
);
const output = await discover(snapshot);
const matched = output.matches.filter((item) => item.status === "matched").length;
console.log(`Discovery complete: ${matched}/${output.total} strongly matched, ${DISCOVERY_PATH}`);

import { MongoClient } from "mongodb";

import {
  buildGalleryItem,
  sendGallerySyncRequest,
  WALL_ART_CATEGORY_SLUG,
} from "../lib/gallery-sync.mjs";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dryRun = args.has("--dry-run") || !apply;

if (args.has("--apply") && args.has("--dry-run")) {
  throw new Error("Choose either --dry-run or --apply, not both.");
}

for (const arg of args) {
  if (arg !== "--apply" && arg !== "--dry-run") {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  throw new Error("MONGODB_URI is not configured.");
}

const client = new MongoClient(mongoUri);

try {
  await client.connect();
  const database = client.db();
  const categories = await database
    .collection("categories")
    .find({ slug: WALL_ART_CATEGORY_SLUG })
    .project({ _id: 1, name: 1, slug: 1 })
    .toArray();

  if (categories.length !== 1) {
    throw new Error(
      `Expected exactly one ${WALL_ART_CATEGORY_SLUG} category; found ${categories.length}. No synchronization was attempted.`,
    );
  }

  const category = categories[0];
  const products = await database
    .collection("products")
    .find({ category: category._id, deletedAt: null })
    .project({
      _id: 1,
      title: 1,
      mainImage: 1,
      images: 1,
      status: 1,
      deletedAt: 1,
      category: 1,
      gallerySortOrder: 1,
    })
    .sort({ _id: 1 })
    .toArray();

  const items = products.map(buildGalleryItem);

  console.log(
    JSON.stringify({
      mode: dryRun ? "dry-run" : "apply",
      category: {
        sourceId: String(category._id),
        name: category.name,
        slug: category.slug,
      },
      count: items.length,
    }),
  );
  for (const item of items) {
    console.log(JSON.stringify({ action: "upsert", item }));
  }

  if (dryRun) {
    console.log(
      JSON.stringify({ ok: true, dryRun: true, synchronized: 0, planned: items.length }),
    );
  } else {
    let synchronized = 0;
    for (const item of items) {
      await sendGallerySyncRequest({ action: "upsert", item });
      synchronized += 1;
    }
    console.log(
      JSON.stringify({ ok: true, dryRun: false, synchronized, planned: items.length }),
    );
  }
} finally {
  await client.close();
}

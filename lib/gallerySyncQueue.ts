import "server-only";

import Category from "@/model/Category";
import GallerySyncJob from "@/model/GallerySyncJob";
import {
  decideGallerySync,
  WALL_ART_CATEGORY_SLUG,
} from "@/lib/gallery-sync.mjs";

type ProductSnapshot = {
  _id?: unknown;
  title?: unknown;
  mainImage?: unknown;
  images?: unknown;
  status?: unknown;
  deletedAt?: unknown;
  category?: unknown;
  gallerySortOrder?: unknown;
};

function plainSnapshot(product: ProductSnapshot | null | undefined) {
  if (!product) return null;
  if (typeof (product as any).toObject === "function") {
    return (product as any).toObject({ depopulate: true });
  }
  return product;
}

async function resolveWallArtCategoryId(): Promise<string> {
  const category = await Category.findOne({ slug: WALL_ART_CATEGORY_SLUG })
    .select("_id")
    .lean();

  if (!category?._id) {
    throw new Error(
      `Wall-art category with slug ${WALL_ART_CATEGORY_SLUG} was not found.`,
    );
  }

  return String(category._id);
}

export async function enqueueGallerySyncTransition(
  before: ProductSnapshot | null | undefined,
  after: ProductSnapshot | null | undefined,
): Promise<boolean> {
  const wallArtCategoryId = await resolveWallArtCategoryId();
  const payload = decideGallerySync(
    plainSnapshot(before),
    plainSnapshot(after),
    wallArtCategoryId,
  );

  if (!payload) return false;

  const sourceId =
    payload.action === "upsert" ? payload.item!.sourceId : payload.sourceId!;
  const now = new Date();

  await GallerySyncJob.findOneAndUpdate(
    { sourceId },
    {
      $set: {
        action: payload.action,
        payload,
        status: "pending",
        attempts: 0,
        nextAttemptAt: now,
        lockedAt: null,
        lastErrorCode: null,
      },
      $inc: { revision: 1 },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return true;
}

export async function safelyEnqueueGallerySyncTransition(
  before: ProductSnapshot | null | undefined,
  after: ProductSnapshot | null | undefined,
): Promise<void> {
  try {
    await enqueueGallerySyncTransition(before, after);
  } catch (error) {
    const sourceId = String((after ?? before)?._id ?? "unknown");
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(
      `[gallery-sync] could not enqueue sourceId=${sourceId}: ${message}`,
    );
  }
}

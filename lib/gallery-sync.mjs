const PRODUCTION_SYNC_URL = "https://katalog-beryl.vercel.app/api/sync";
const WALL_ART_CATEGORY_SLUG = "gaming-wall-art";
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const MAX_IMAGES = 24;

export class GallerySyncConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "GallerySyncConfigurationError";
  }
}

export class GallerySyncRequestError extends Error {
  constructor(message, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "GallerySyncRequestError";
    this.status = options.status;
    this.code = options.code ?? "request_failed";
  }
}

export function getGallerySyncConfig(env = process.env) {
  const rawUrl = env.GALLERY_SYNC_URL?.trim();
  const apiKey = env.GALLERY_SYNC_API_KEY?.trim();

  if (!rawUrl) {
    throw new GallerySyncConfigurationError("GALLERY_SYNC_URL is not configured.");
  }

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new GallerySyncConfigurationError("GALLERY_SYNC_URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.toString() !== PRODUCTION_SYNC_URL
  ) {
    throw new GallerySyncConfigurationError(
      "GALLERY_SYNC_URL must be the configured production HTTPS endpoint.",
    );
  }

  if (!apiKey) {
    throw new GallerySyncConfigurationError("GALLERY_SYNC_API_KEY is not configured.");
  }

  return { url: PRODUCTION_SYNC_URL, apiKey };
}

function objectIdString(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value._id !== undefined) {
    return String(value._id);
  }
  return String(value);
}

function validImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function buildGalleryItem(product) {
  const sourceId = objectIdString(product?._id);
  const name = typeof product?.title === "string" ? product.title.trim() : "";
  const imageUrl = validImageUrl(product?.mainImage);

  if (!sourceId || !name || !imageUrl) {
    throw new GallerySyncConfigurationError(
      "Wall-art product requires an id, name, and HTTP(S) main image.",
    );
  }

  const candidateImages = [
    imageUrl,
    ...(Array.isArray(product?.images)
      ? product.images.map((image) =>
          validImageUrl(typeof image === "string" ? image : image?.url),
        )
      : []),
  ];
  const images = [...new Set(candidateImages.filter(Boolean))].slice(0, MAX_IMAGES);
  const requestedSortOrder = Number(product?.gallerySortOrder);
  const sortOrder =
    Number.isInteger(requestedSortOrder) &&
    requestedSortOrder >= -1_000_000 &&
    requestedSortOrder <= 1_000_000
      ? requestedSortOrder
      : 0;

  return {
    sourceId,
    name,
    imageUrl,
    images,
    sortOrder,
    isVisible: product?.status === "published" && !product?.deletedAt,
  };
}

export function decideGallerySync(before, after, wallArtCategoryId) {
  const wallId = objectIdString(wallArtCategoryId);
  if (!wallId) {
    throw new GallerySyncConfigurationError("Wall-art category id is unavailable.");
  }

  const beforeWasWallArt = objectIdString(before?.category) === wallId;
  const afterIsWallArt = objectIdString(after?.category) === wallId;

  if (after && afterIsWallArt) {
    return { action: "upsert", item: buildGalleryItem(after) };
  }

  if (before && beforeWasWallArt) {
    const sourceId = objectIdString(before._id);
    if (!sourceId) {
      throw new GallerySyncConfigurationError("Deleted wall-art product has no id.");
    }
    return { action: "delete", sourceId };
  }

  return null;
}

export function computeRetryDelayMs(attempt, random = Math.random) {
  const normalizedAttempt = Math.max(1, Number.isFinite(attempt) ? attempt : 1);
  const base = Math.min(60 * 60 * 1_000, 5_000 * 2 ** (normalizedAttempt - 1));
  const jitter = Math.floor(base * 0.2 * Math.max(0, Math.min(1, random())));
  return base + jitter;
}

export async function sendGallerySyncRequest(
  payload,
  {
    env = process.env,
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  } = {},
) {
  const { url, apiKey } = getGallerySyncConfig(env);
  if (typeof fetchImpl !== "function") {
    throw new GallerySyncConfigurationError("A fetch implementation is required.");
  }

  const controller = new AbortController();
  const boundedTimeout = Math.max(1, Math.min(30_000, Number(timeoutMs) || 1));
  const timer = setTimeout(() => controller.abort(), boundedTimeout);

  let response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "error",
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    throw new GallerySyncRequestError(
      timedOut ? "Gallery sync request timed out." : "Gallery sync network request failed.",
      { cause: error, code: timedOut ? "timeout" : "network" },
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new GallerySyncRequestError("Gallery sync endpoint rejected the request.", {
      status: response.status,
      code: `http_${response.status}`,
    });
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new GallerySyncRequestError("Gallery sync response was not valid JSON.", {
      cause: error,
      status: response.status,
      code: "invalid_response",
    });
  }

  if (!result || result.ok !== true) {
    throw new GallerySyncRequestError("Gallery sync endpoint returned an unsuccessful result.", {
      status: response.status,
      code: "unsuccessful_response",
    });
  }

  return result;
}

export {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_IMAGES,
  PRODUCTION_SYNC_URL,
  WALL_ART_CATEGORY_SLUG,
};

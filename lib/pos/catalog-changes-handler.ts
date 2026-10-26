import { posAuthResponse, type PosAuthResult } from "./auth-core.ts";
import {
  CatalogChangesPaginationError,
  parseCatalogChangesPagination,
  type CatalogChangesPageResult,
  type CatalogChangesPagination,
} from "./catalog-changes.ts";

export type CatalogChangesHandlerDependencies = {
  authenticate: (request: Request) => Promise<PosAuthResult>;
  getPage: (
    pagination: CatalogChangesPagination,
  ) => Promise<CatalogChangesPageResult>;
};

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
  expires: "0",
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export async function handleCatalogChangesRequest(
  request: Request,
  dependencies: CatalogChangesHandlerDependencies,
) {
  const authentication = await dependencies.authenticate(request);
  if (!authentication.ok) return posAuthResponse(authentication);

  let pagination: CatalogChangesPagination;
  try {
    pagination = parseCatalogChangesPagination(request.url);
  } catch (error) {
    if (error instanceof CatalogChangesPaginationError) {
      return jsonResponse(
        { error: { code: "POS_CATALOG_CHANGES_INVALID_PAGINATION" } },
        400,
      );
    }
    throw error;
  }

  try {
    const result = await dependencies.getPage(pagination);
    if (!result.ok) {
      if (result.reason === "history_unavailable") {
        return jsonResponse(
          {
            error: {
              code: "POS_CATALOG_FULL_RESYNC_REQUIRED",
              snapshotUrl: "/api/pos/v1/catalog/snapshot",
              minimumAvailableCursor: result.minimumAvailableCursor,
              highWaterCursor: result.highWaterCursor,
            },
          },
          410,
        );
      }
      return jsonResponse(
        {
          error: {
            code: "POS_CATALOG_CHANGES_CURSOR_AHEAD",
            highWaterCursor: result.highWaterCursor,
          },
        },
        400,
      );
    }

    return jsonResponse({
      apiVersion: "v1",
      items: result.items,
      pagination: result.pagination,
    });
  } catch {
    // Authorization contains a raw bearer token, so request headers are never logged.
    console.error("[pos.catalog.changes] outbox query failed");
    return jsonResponse(
      { error: { code: "POS_CATALOG_CHANGES_UNAVAILABLE" } },
      500,
    );
  }
}


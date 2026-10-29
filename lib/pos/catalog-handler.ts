import { posAuthResponse, type PosAuthResult } from "./auth-core.ts";
import {
  CatalogPaginationError,
  parseCatalogPagination,
  type CatalogPagination,
  type CatalogSnapshotPage,
} from "./catalog.ts";

export type CatalogSnapshotHandlerDependencies = {
  authenticate: (request: Request) => Promise<PosAuthResult>;
  getPage: (pagination: CatalogPagination) => Promise<CatalogSnapshotPage>;
};

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
  expires: "0",
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export async function handleCatalogSnapshotRequest(
  request: Request,
  dependencies: CatalogSnapshotHandlerDependencies,
): Promise<Response> {
  const authentication = await dependencies.authenticate(request);
  if (!authentication.ok) return posAuthResponse(authentication);

  let pagination: CatalogPagination;
  try {
    pagination = parseCatalogPagination(request.url);
  } catch (error) {
    if (error instanceof CatalogPaginationError) {
      return jsonResponse(
        { error: { code: "POS_CATALOG_INVALID_PAGINATION" } },
        400,
      );
    }
    throw error;
  }

  try {
    const page = await dependencies.getPage(pagination);
    return jsonResponse({ apiVersion: "v1", ...page });
  } catch {
    // Never log request headers: Authorization contains the raw POS token.
    console.error("[pos.catalog.snapshot] catalog query failed");
    return jsonResponse(
      { error: { code: "POS_CATALOG_UNAVAILABLE" } },
      500,
    );
  }
}

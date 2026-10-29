import { authenticatePosRequest } from "@/lib/pos/auth";
import { handleCatalogSnapshotRequest } from "@/lib/pos/catalog-handler";
import { getCatalogSnapshotPage } from "@/lib/pos/catalog-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  return handleCatalogSnapshotRequest(request, {
    authenticate: (incomingRequest) =>
      authenticatePosRequest(incomingRequest, ["catalog"]),
    getPage: getCatalogSnapshotPage,
  });
}

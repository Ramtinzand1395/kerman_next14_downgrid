import { authenticatePosRequest } from "@/lib/pos/auth";
import { handleCatalogChangesRequest } from "@/lib/pos/catalog-changes-handler";
import { getCatalogChangesPage } from "@/lib/pos/catalog-changes-repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  return handleCatalogChangesRequest(request, {
    authenticate: (incomingRequest) =>
      authenticatePosRequest(incomingRequest, ["catalog"]),
    getPage: getCatalogChangesPage,
  });
}

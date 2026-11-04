import { posAuthResponse, type PosAuthResult } from "./auth-core.ts";

const SALE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
  expires: "0",
};

export type PosSaleLookupReceipt = {
  saleId: string;
  siteSaleId: string;
  invoiceNumber: string;
  soldAtUtc: string;
  syncedAtUtc: string;
  finalAmountToman: number;
  syncStatus: "synced" | "review_required";
  reviewReasons: string[];
};

export type PosSaleLookupDependencies = {
  authenticate: (request: Request) => Promise<PosAuthResult>;
  findSale: (deviceId: string, saleId: string) => Promise<PosSaleLookupReceipt | null>;
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

// Read-only reconciliation remains available when POS_SALES_ENABLED is false.
// The device identity must come from authentication, never a client-supplied query.
export async function handlePosSaleLookupRequest(
  request: Request,
  saleId: string,
  dependencies: PosSaleLookupDependencies,
): Promise<Response> {
  const authentication = await dependencies.authenticate(request);
  if (!authentication.ok) return posAuthResponse(authentication);

  if (typeof saleId !== "string" || !SALE_ID_PATTERN.test(saleId)) {
    return json({ error: { code: "POS_SALE_INVALID_ID" } }, 400);
  }

  try {
    const sale = await dependencies.findSale(authentication.device.deviceId, saleId);
    if (!sale) return json({ error: { code: "POS_SALE_NOT_FOUND" } }, 404);
    return json({ apiVersion: "v1", sale }, 200);
  } catch {
    // No token, customer, request headers or saleId in logs.
    console.error("[pos.sales.lookup] read failed");
    return json({ error: { code: "POS_SALE_LOOKUP_UNAVAILABLE" } }, 503);
  }
}

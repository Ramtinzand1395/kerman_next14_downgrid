import { posAuthResponse, type PosAuthResult } from "./auth-core.ts";
import {
  PosSaleConflictError,
  PosSaleIdempotencyConflictError,
} from "./sales-errors.ts";
import type { PosSaleResponse } from "./sales-service";
import { PosSaleValidationError } from "./sales-contract.ts";

type RegisterResult = { sale: PosSaleResponse; replayed: boolean };

export type PosSalesHandlerDependencies = {
  authenticate: (request: Request) => Promise<PosAuthResult>;
  registerSale: (
    body: unknown,
    context: { deviceId: string },
  ) => Promise<RegisterResult>;
};

const noStoreHeaders = {
  "cache-control": "no-store, no-cache, must-revalidate, private",
  pragma: "no-cache",
  expires: "0",
};

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: noStoreHeaders });
}

export async function handlePosSaleRequest(
  request: Request,
  dependencies: PosSalesHandlerDependencies,
) {
  const authentication = await dependencies.authenticate(request);
  if (!authentication.ok) return posAuthResponse(authentication);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: { code: "POS_SALE_INVALID_JSON" } }, 400);
  }

  try {
    const result = await dependencies.registerSale(body, {
      deviceId: authentication.device.deviceId,
    });
    return json(
      {
        apiVersion: "v1",
        replayed: result.replayed,
        sale: result.sale,
      },
      result.replayed ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof PosSaleValidationError) {
      return json(
        {
          error: {
            code: "POS_SALE_INVALID_REQUEST",
            field: error.field,
          },
        },
        400,
      );
    }
    if (error instanceof PosSaleIdempotencyConflictError) {
      return json({ error: { code: error.code } }, 409);
    }
    if (error instanceof PosSaleConflictError) {
      return json(
        { error: { code: error.code, conflicts: error.conflicts } },
        409,
      );
    }
    // Authorization headers and request bodies may contain secrets or PII.
    console.error("[pos.sales] transactional sale registration failed");
    return json({ error: { code: "POS_SALE_UNAVAILABLE" } }, 500);
  }
}

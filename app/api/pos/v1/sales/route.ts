import { authenticatePosRequest } from "@/lib/pos/auth";
import { handlePosSaleRequest } from "@/lib/pos/sales-handler";
import { registerPosSale } from "@/lib/pos/sales-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  if (process.env.POS_SALES_ENABLED?.trim().toLowerCase() !== "true") {
    return Response.json(
      { error: { code: "POS_SALES_DISABLED" } },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "retry-after": "300",
        },
      },
    );
  }

  return handlePosSaleRequest(request, {
    authenticate: (incomingRequest) =>
      authenticatePosRequest(incomingRequest, ["sales"]),
    registerSale: registerPosSale,
  });
}

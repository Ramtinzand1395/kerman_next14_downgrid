import { authenticatePosRequest } from "@/lib/pos/auth";
import { handlePosSaleRequest } from "@/lib/pos/sales-handler";
import { registerPosSale } from "@/lib/pos/sales-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  return handlePosSaleRequest(request, {
    authenticate: (incomingRequest) =>
      authenticatePosRequest(incomingRequest, ["sales"]),
    registerSale: registerPosSale,
  });
}

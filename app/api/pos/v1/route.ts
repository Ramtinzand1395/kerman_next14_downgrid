import { authenticatePosRequest } from "@/lib/pos/auth";
import { posAuthResponse } from "@/lib/pos/auth-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authentication = await authenticatePosRequest(request, ["catalog"]);
  return posAuthResponse(authentication);
}

import { handlePosTokenRequest } from "@/lib/pos/authService";
import { createServerPosAuthDependencies } from "@/lib/pos/serverAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function POST(request: Request): Promise<Response> {
  try {
    return await handlePosTokenRequest(request, createServerPosAuthDependencies());
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "pos.auth.internal_error",
        errorType: error instanceof Error ? error.name : "UnknownError",
      }),
    );
    return Response.json(
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "POS authentication is temporarily unavailable.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

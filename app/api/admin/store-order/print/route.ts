import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { parsePrintPayloadRequest } from "@/lib/print/payload";
import {
  createPrintJob,
  listPrintJobsForConsumer,
} from "@/lib/print/queue";
import {
  authenticatePrinterRequest,
  printerConsumerId,
} from "@/lib/printer/auth";
import { printerAuthResponse } from "@/lib/printer/auth-core";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function GET(request: Request) {
  const authorization = await authenticatePrinterRequest(request, [
    "queue:read",
  ]);
  if (!authorization.ok) return printerAuthResponse(authorization);

  try {
    const jobs = await listPrintJobsForConsumer(
      printerConsumerId(authorization.device.deviceId),
    );
    return NextResponse.json(
      {
        success: true,
        jobExists: jobs.length > 0,
        payload: jobs.length > 0 ? jobs : null,
      },
      {
        headers: {
          ...noStoreHeaders,
          "x-print-auth-mode": authorization.compatibilityMode
            ? "compatibility"
            : "authenticated",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "PRINT_QUEUE_UNAVAILABLE" } },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHENTICATED" } },
      { status: 401, headers: noStoreHeaders },
    );
  }
  if (!["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json(
      { success: false, error: { code: "FORBIDDEN" } },
      { status: 403, headers: noStoreHeaders },
    );
  }

  const parsed = await parsePrintPayloadRequest(request);
  if (!parsed.ok) {
    return NextResponse.json(
      { success: false, error: { code: parsed.code } },
      { status: parsed.status, headers: noStoreHeaders },
    );
  }

  try {
    await createPrintJob(parsed.payload, session.user.id);
    return NextResponse.json(
      { success: true },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "PRINT_QUEUE_UNAVAILABLE" } },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

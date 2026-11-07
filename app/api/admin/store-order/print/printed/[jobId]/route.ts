import { acknowledgePrintJob } from "@/lib/print/queue";
import {
  authenticatePrinterRequest,
  printerConsumerId,
} from "@/lib/printer/auth";
import { printerAuthResponse } from "@/lib/printer/auth-core";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const noStoreHeaders = { "cache-control": "no-store" };

export async function DELETE(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const authorization = await authenticatePrinterRequest(request, [
    "queue:ack",
  ]);
  if (!authorization.ok) return printerAuthResponse(authorization);

  if (!OBJECT_ID_PATTERN.test(params.jobId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_PRINT_JOB_ID" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const result = await acknowledgePrintJob(
      params.jobId,
      printerConsumerId(authorization.device.deviceId),
    );
    if (result.state === "not-found") {
      return NextResponse.json(
        {
          success: false,
          error: "Print job not found",
        },
        { status: 404, headers: noStoreHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Print job removed successfully",
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
      {
        success: false,
        error: { code: "PRINT_QUEUE_UNAVAILABLE" },
      },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

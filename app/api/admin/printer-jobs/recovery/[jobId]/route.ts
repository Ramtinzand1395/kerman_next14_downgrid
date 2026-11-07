import { recoverPrintJob } from "@/lib/print/queue";
import { requirePrinterSuperadmin } from "@/lib/printer/admin";
import { PRINTER_DEVICE_ID_PATTERN } from "@/lib/printer/constants";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const noStoreHeaders = { "cache-control": "no-store" };

function isValidConsumerId(value: unknown): value is string {
  if (value === "printer:legacy-kerman-printer") return true;
  if (typeof value !== "string" || !value.startsWith("printer:")) return false;
  return PRINTER_DEVICE_ID_PATTERN.test(value.slice("printer:".length));
}

export async function POST(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const authorization = await requirePrinterSuperadmin();
  if (!authorization.ok) return authorization.response;

  if (!OBJECT_ID_PATTERN.test(params.jobId)) {
    return NextResponse.json(
      { error: { code: "INVALID_PRINT_JOB_ID" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  let body: {
    action?: unknown;
    expectedConsumerId?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const action = String(body.action);
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (
    !["release_not_printed", "mark_printed"].includes(action) ||
    !isValidConsumerId(body.expectedConsumerId) ||
    reason.length < 10 ||
    reason.length > 500
  ) {
    return NextResponse.json(
      { error: { code: "INVALID_PRINT_RECOVERY_INPUT" } },
      { status: 400, headers: noStoreHeaders },
    );
  }

  try {
    const job = await recoverPrintJob({
      jobId: params.jobId,
      expectedConsumerId: body.expectedConsumerId,
      action: action as "release_not_printed" | "mark_printed",
      reason,
      actorUserId: authorization.userId,
    });
    if (!job) {
      return NextResponse.json(
        { error: { code: "PRINT_RECOVERY_CONFLICT" } },
        { status: 409, headers: noStoreHeaders },
      );
    }
    return NextResponse.json(
      { success: true, job },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "PRINT_RECOVERY_UNAVAILABLE" } },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

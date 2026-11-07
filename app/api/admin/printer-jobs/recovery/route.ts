import { getPrintRecoveryCandidates } from "@/lib/print/queue";
import { requirePrinterSuperadmin } from "@/lib/printer/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store" };

export async function GET() {
  const authorization = await requirePrinterSuperadmin();
  if (!authorization.ok) return authorization.response;

  try {
    const jobs = await getPrintRecoveryCandidates();
    return NextResponse.json({ jobs }, { headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { error: { code: "PRINT_RECOVERY_UNAVAILABLE" } },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
  // Also hide the banner in browser tabs still running the previous client bundle.
  return NextResponse.json({ campaign: null }, { headers });
}

import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isPrinterScope, type PrinterScope } from "./constants";

export async function requirePrinterSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED" } },
        { status: 401, headers: { "cache-control": "no-store" } },
      ),
    };
  }
  if (session.user.role !== "superadmin") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FORBIDDEN" } },
        { status: 403, headers: { "cache-control": "no-store" } },
      ),
    };
  }
  return { ok: true as const, userId: session.user.id };
}

export function parsePrinterDeviceName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name && name.length <= 100 ? name : null;
}

export function parsePrinterScopes(value: unknown): PrinterScope[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const scopes = [...new Set(value)];
  return scopes.every(isPrinterScope) ? scopes : null;
}

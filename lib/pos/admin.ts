import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isPosScope, type PosScope } from "./constants";

export async function requirePosSuperadmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "UNAUTHENTICATED" } },
        { status: 401 },
      ),
    };
  }
  if (session.user.role !== "superadmin") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FORBIDDEN" } },
        { status: 403 },
      ),
    };
  }
  return { ok: true as const, userId: session.user.id };
}

export function parsePosScopes(value: unknown): PosScope[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const scopes = [...new Set(value)];
  if (!scopes.every(isPosScope)) return null;
  return scopes;
}

export function parsePosDeviceName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > 100) return null;
  return name;
}

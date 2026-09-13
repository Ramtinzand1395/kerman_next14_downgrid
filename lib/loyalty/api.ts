// lib/loyalty/api.ts
// زیرساخت مشترک APIهای باشگاه مشتریان:
// - احراز هویت کاربر/مدیر (getServerSession)
// - پاسخ استاندارد JSON
// - Rate Limiting ساده درون‌حافظه‌ای (per-process)
// - کمک‌تابع پارس Zod
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import { ZodSchema } from "zod";

// ---------- پاسخ استاندارد ----------

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

// ---------- احراز هویت ----------

export async function requireUser() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: fail("ابتدا وارد حساب کاربری شوید", 401) };
  return { userId: session.user.id as string, session };
}

export async function requireAdmin() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: fail("ابتدا وارد حساب کاربری شوید", 401) };
  const role = (session.user as { role?: string }).role;
  if (role !== "admin" && role !== "superadmin") {
    return { error: fail("دسترسی غیرمجاز", 403) };
  }
  return { userId: session.user.id as string, role, session };
}

// ---------- Rate Limiting (درون‌حافظه‌ای) ----------
// نکته production: در مقیاس چندنمونه‌ای باید Redis جایگزین شود.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export function withRateLimit(key: string, opts: { limit: number; windowMs: number }) {
  if (!rateLimit(key, opts)) {
    return fail("درخواست‌های شما بیش از حد مجاز است. کمی بعد تلاش کنید", 429);
  }
  return null;
}

// ---------- پارس Zod ----------

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<{ data?: T; error?: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: fail("بدنه درخواست نامعتبر است", 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: fail(first?.message ?? "ورودی نامعتبر است", 422) };
  }
  return { data: parsed.data };
}

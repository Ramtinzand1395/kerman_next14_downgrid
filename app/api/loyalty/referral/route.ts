// app/api/loyalty/referral/route.ts
// GET: کد دعوت و آمار رفرال کاربر
import { ok, requireUser } from "@/lib/loyalty/api";
import { attachReferral, getReferralStats } from "@/lib/loyalty/referral.service";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return ok(await getReferralStats(auth.userId));
}

/** اتصال کد دعوت برای کاربری که هنوز در هیچ رفال ثبت نشده است. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "بدنه درخواست نامعتبر است" }), { status: 400 });
  }

  const code = typeof (body as { code?: unknown })?.code === "string"
    ? (body as { code: string }).code
    : "";
  const result = await attachReferral(auth.userId, code);
  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, error: result.error }), { status: 400 });
  }
  return ok({ attached: true });
}

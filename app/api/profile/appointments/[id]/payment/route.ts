import { requireUser, fail, ok, withRateLimit } from "@/lib/loyalty/api";
import { createAppointmentPaymentLink } from "@/lib/appointments/payment-link";

export async function POST(_req: Request, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const limited = withRateLimit(`appointment-pay:${auth.userId}`, { limit: 5, windowMs: 60_000 });
  if (limited) return limited;
  const { id } = await params;
  const result = await createAppointmentPaymentLink(id, auth.userId);
  if ("error" in result) return fail(result.error, result.status);
  return ok(result);
}

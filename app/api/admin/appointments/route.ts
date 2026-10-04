import { requireAdmin, ok } from "@/lib/loyalty/api";
import Appointment from "@/model/Appointment";

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const filter: Record<string, unknown> = {};
  const status = url.searchParams.get("status");
  const serviceType = url.searchParams.get("serviceType");
  const date = url.searchParams.get("date");
  if (status) filter.status = status;
  if (serviceType) filter.serviceType = serviceType;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    filter.startsAt = {
      $gte: new Date(`${date}T00:00:00+03:30`),
      $lt: new Date(`${date}T23:59:59.999+03:30`),
    };
  }
  const [items, total] = await Promise.all([
    Appointment.find(filter)
      .populate("user", "username mobile")
      .populate("selectedReward")
      .sort({ startsAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(filter),
  ]);
  return ok({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}


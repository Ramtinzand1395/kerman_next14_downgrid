// app/api/admin/loyalty/campaigns/route.ts — لیست/ساخت کمپین
import Campaign from "@/model/Campaign";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { campaignSchema } from "@/validations/loyalty.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await Campaign.find().sort({ createdAt: -1 }).lean());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { data, error } = await parseBody(req, campaignSchema);
  if (error) return error;
  return ok(await Campaign.create({ ...data!, createdBy: auth.userId }), 201);
}

// app/api/admin/loyalty/cashback/route.ts — لیست/ساخت قاعده کش‌بک
import CashbackRule from "@/model/Loyalty Club/Cashback";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { cashbackRuleSchema } from "@/validations/loyalty.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await CashbackRule.find().sort({ priority: -1 }).lean());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { data, error } = await parseBody(req, cashbackRuleSchema);
  if (error) return error;
  return ok(await CashbackRule.create(data!), 201);
}

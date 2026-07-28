// app/api/admin/loyalty/spin/route.ts — لیست/ساخت جایزه گردونه
import { SpinPrize } from "@/model/SpinHistory";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { spinPrizeSchema } from "@/validations/loyalty.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await SpinPrize.find().sort({ order: 1 }).lean());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { data, error } = await parseBody(req, spinPrizeSchema);
  if (error) return error;
  return ok(await SpinPrize.create(data!), 201);
}

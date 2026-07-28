// app/api/admin/loyalty/achievements/route.ts — لیست/ساخت نشان
import Achievement from "@/model/Achievement";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { achievementSchema } from "@/validations/loyalty.validation";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await Achievement.find().sort({ order: 1 }).lean());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { data, error } = await parseBody(req, achievementSchema);
  if (error) return error;
  return ok(await Achievement.create(data!), 201);
}

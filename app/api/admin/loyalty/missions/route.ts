// app/api/admin/loyalty/missions/route.ts — لیست/ساخت ماموریت
import { NextRequest } from "next/server";
import Mission from "@/model/Loyalty Club/Mission";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { missionSchema } from "@/validations/loyalty.validation";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.get("period")) filter.period = sp.get("period");
  if (sp.get("isActive")) filter.isActive = sp.get("isActive") === "true";

  const items = await Mission.find(filter).sort({ createdAt: -1 }).lean();
  return ok(items);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, missionSchema);
  if (error) return error;

  const mission = await Mission.create({ ...data!, createdBy: auth.userId });
  return ok(mission, 201);
}

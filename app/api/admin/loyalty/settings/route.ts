// app/api/admin/loyalty/settings/route.ts — مشاهده/ویرایش تنظیمات سراسری
import LoyaltySettings from "@/model/Loyalty Club/LoyaltySettings";
import { ok, parseBody, requireAdmin } from "@/lib/loyalty/api";
import { loyaltySettingsSchema } from "@/validations/loyalty.validation";
import { getSettings, invalidateSettingsCache } from "@/lib/loyalty/experience.service";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await getSettings());
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { data, error } = await parseBody(req, loyaltySettingsSchema);
  if (error) return error;

  // ساخت $set تخت برای فیلدهای تو در تو
  const flat: Record<string, unknown> = { updatedBy: auth.userId };
  for (const [section, values] of Object.entries(data!)) {
    if (!values) continue;
    for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
      flat[`${section}.${k}`] = v;
    }
  }

  const doc = await LoyaltySettings.findOneAndUpdate(
    { key: "global" },
    { $set: flat },
    { upsert: true, new: true },
  );
  invalidateSettingsCache();
  return ok(doc);
}

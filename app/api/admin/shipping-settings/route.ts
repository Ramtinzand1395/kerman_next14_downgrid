import { z } from "zod";
import { requireAdmin, ok, fail } from "@/lib/loyalty/api";
import StoreShippingSettings from "@/model/StoreShippingSettings";
import { isValidIranDestination } from "@/lib/shipping";
import { getStoreShippingSettings, normalizeShippingSettings } from "@/lib/shippingSettings";

const text = z.string().trim().min(2).max(500);
const schema = z.object({
  localDelivery: z.object({
    enabled: z.boolean(),
    feeToman: z.number().int().min(1).max(100_000_000),
    title: text.max(100),
    description: text,
  }),
  nationalCollect: z.object({
    enabled: z.boolean(),
    availableForLocalAddresses: z.boolean(),
    title: text.max(100),
    description: text,
  }),
  tipax: z.object({
    enabled: z.boolean(),
    title: text.max(100),
    description: text,
  }),
  postPishtaz: z.object({
    enabled: z.boolean(),
    title: text.max(100),
    description: text,
  }),
  coverage: z.object({
    province: z.string().trim().min(2).max(100),
    cities: z.array(z.string().trim().min(2).max(100)).min(1).max(50),
    postalCodePrefixes: z.array(z.string().regex(/^\d{1,10}$/)).max(100),
  }),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return ok(await getStoreShippingSettings());
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "تنظیمات ارسال نامعتبر است.", 422);
  if (
    !parsed.data.localDelivery.enabled &&
    !parsed.data.nationalCollect.enabled &&
    !parsed.data.tipax.enabled &&
    !parsed.data.postPishtaz.enabled
  ) {
    return fail("حداقل یک روش ارسال باید فعال باشد.", 422);
  }
  const invalidCity = parsed.data.coverage.cities.find(
    (city) => !isValidIranDestination({ province: parsed.data.coverage.province, city }),
  );
  if (invalidCity) return fail(`شهر «${invalidCity}» متعلق به استان انتخاب‌شده نیست.`, 422);

  const updated = await StoreShippingSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { ...parsed.data, version: 1, updatedBy: auth.userId } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true },
  );
  return ok(normalizeShippingSettings(updated));
}

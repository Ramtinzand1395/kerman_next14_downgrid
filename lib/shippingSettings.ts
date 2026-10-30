import StoreShippingSettings from "@/model/StoreShippingSettings";
import dbConnect from "@/lib/mongodb";
import {
  DEFAULT_SHIPPING_SETTINGS,
  type StoreShippingSettings as StoreShippingSettingsValue,
} from "@/lib/shipping";

const text = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

export function normalizeShippingSettings(value: any): StoreShippingSettingsValue {
  const fee = Number(value?.localDelivery?.feeToman);
  return {
    version: 1,
    localDelivery: {
      enabled: value?.localDelivery?.enabled !== false,
      feeToman: Number.isSafeInteger(fee) && fee > 0 ? fee : 150_000,
      title: text(value?.localDelivery?.title, DEFAULT_SHIPPING_SETTINGS.localDelivery.title),
      description: text(
        value?.localDelivery?.description,
        DEFAULT_SHIPPING_SETTINGS.localDelivery.description,
      ),
    },
    nationalCollect: {
      enabled: value?.nationalCollect?.enabled !== false,
      availableForLocalAddresses:
        value?.nationalCollect?.availableForLocalAddresses !== false,
      title: text(
        value?.nationalCollect?.title,
        DEFAULT_SHIPPING_SETTINGS.nationalCollect.title,
      ),
      description: text(
        value?.nationalCollect?.description,
        DEFAULT_SHIPPING_SETTINGS.nationalCollect.description,
      ),
    },
    tipax: {
      enabled: value?.tipax?.enabled === true,
      title: text(value?.tipax?.title, DEFAULT_SHIPPING_SETTINGS.tipax.title),
      description: text(value?.tipax?.description, DEFAULT_SHIPPING_SETTINGS.tipax.description),
    },
    postPishtaz: {
      enabled: value?.postPishtaz?.enabled === true,
      title: text(value?.postPishtaz?.title, DEFAULT_SHIPPING_SETTINGS.postPishtaz.title),
      description: text(
        value?.postPishtaz?.description,
        DEFAULT_SHIPPING_SETTINGS.postPishtaz.description,
      ),
    },
    coverage: {
      province: text(value?.coverage?.province, "کرمان"),
      cities:
        Array.isArray(value?.coverage?.cities) && value.coverage.cities.length
          ? value.coverage.cities.map(String).map((item: string) => item.trim()).filter(Boolean)
          : ["کرمان"],
      postalCodePrefixes: Array.isArray(value?.coverage?.postalCodePrefixes)
        ? value.coverage.postalCodePrefixes
            .map(String)
            .map((item: string) => item.replace(/\D/g, ""))
            .filter(Boolean)
        : [],
    },
  };
}

export async function getStoreShippingSettings(): Promise<StoreShippingSettingsValue> {
  await dbConnect();
  const stored = await StoreShippingSettings.findOne({ key: "global" }).lean();
  return normalizeShippingSettings(stored || DEFAULT_SHIPPING_SETTINGS);
}

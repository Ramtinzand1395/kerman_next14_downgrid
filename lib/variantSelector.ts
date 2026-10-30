import type {
  ProductVariant,
  VariantAttributeSelection,
  VariantSelectorConfig,
  VariantSelectorDisplayType,
} from "@/types";

const STABLE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const DISPLAY_TYPES = new Set<VariantSelectorDisplayType>([
  "dropdown",
  "radio",
  "chips",
  "swatches",
]);

export class VariantSelectorValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "VariantSelectorValidationError";
    this.field = field;
  }
}

const stringValue = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

function requireStableId(value: unknown, field: string) {
  const id = stringValue(value);
  if (!STABLE_ID.test(id)) {
    throw new VariantSelectorValidationError(
      field,
      `${field} باید یک شناسه پایدار شامل حروف انگلیسی، عدد، خط تیره یا زیرخط باشد.`,
    );
  }
  return id;
}

function requireText(value: unknown, field: string) {
  const text = stringValue(value);
  if (!text) {
    throw new VariantSelectorValidationError(field, `${field} الزامی است.`);
  }
  return text;
}

function assertUniqueOrder(items: Array<{ order: number }>, field: string) {
  const orders = new Set<number>();
  for (const [index, item] of items.entries()) {
    if (!Number.isSafeInteger(item.order) || item.order < 0) {
      throw new VariantSelectorValidationError(
        `${field}.${index}.order`,
        "ترتیب نمایش باید عدد صحیح و نامنفی باشد.",
      );
    }
    if (orders.has(item.order)) {
      throw new VariantSelectorValidationError(
        `${field}.${index}.order`,
        "ترتیب نمایش تکراری است.",
      );
    }
    orders.add(item.order);
  }
}

export function normalizeVariantSelector(
  rawValue: unknown,
  variants: readonly ProductVariant[],
  status: "draft" | "published",
): VariantSelectorConfig | undefined {
  if (rawValue === undefined || rawValue === null) return undefined;
  if (typeof rawValue !== "object") {
    throw new VariantSelectorValidationError(
      "variantSelector",
      "ساختار انتخاب‌گر سفارشی نامعتبر است.",
    );
  }

  const raw = rawValue as Record<string, unknown>;
  const enabled = raw.enabled === true;
  const rawGroups = Array.isArray(raw.groups) ? raw.groups : [];
  const groupIds = new Set<string>();
  const groupKeys = new Set<string>();

  const groups = rawGroups.map((item, groupIndex) => {
    if (!item || typeof item !== "object") {
      throw new VariantSelectorValidationError(
        `variantSelector.groups.${groupIndex}`,
        "ساختار گروه انتخاب نامعتبر است.",
      );
    }
    const group = item as Record<string, unknown>;
    const id = requireStableId(
      group.id,
      `variantSelector.groups.${groupIndex}.id`,
    );
    const key = requireStableId(
      group.key,
      `variantSelector.groups.${groupIndex}.key`,
    ).toLowerCase();
    if (groupIds.has(id)) {
      throw new VariantSelectorValidationError(
        `variantSelector.groups.${groupIndex}.id`,
        "شناسه گروه انتخاب تکراری است.",
      );
    }
    if (groupKeys.has(key)) {
      throw new VariantSelectorValidationError(
        `variantSelector.groups.${groupIndex}.key`,
        "کلید داخلی گروه انتخاب تکراری است.",
      );
    }
    groupIds.add(id);
    groupKeys.add(key);

    const rawOptions = Array.isArray(group.options) ? group.options : [];
    const optionIds = new Set<string>();
    const options = rawOptions.map((rawOption, optionIndex) => {
      if (!rawOption || typeof rawOption !== "object") {
        throw new VariantSelectorValidationError(
          `variantSelector.groups.${groupIndex}.options.${optionIndex}`,
          "ساختار گزینه نامعتبر است.",
        );
      }
      const option = rawOption as Record<string, unknown>;
      const optionId = requireStableId(
        option.id,
        `variantSelector.groups.${groupIndex}.options.${optionIndex}.id`,
      );
      if (optionIds.has(optionId)) {
        throw new VariantSelectorValidationError(
          `variantSelector.groups.${groupIndex}.options.${optionIndex}.id`,
          "شناسه گزینه در این گروه تکراری است.",
        );
      }
      optionIds.add(optionId);
      return {
        id: optionId,
        label: requireText(
          option.label,
          `variantSelector.groups.${groupIndex}.options.${optionIndex}.label`,
        ),
        order: Number(option.order),
        ...(stringValue(option.color) ? { color: stringValue(option.color) } : {}),
      };
    });
    assertUniqueOrder(options, `variantSelector.groups.${groupIndex}.options`);

    const displayType = stringValue(group.displayType) as VariantSelectorDisplayType;
    if (!DISPLAY_TYPES.has(displayType)) {
      throw new VariantSelectorValidationError(
        `variantSelector.groups.${groupIndex}.displayType`,
        "نوع نمایش گروه انتخاب معتبر نیست.",
      );
    }

    return {
      id,
      key,
      label: requireText(
        group.label,
        `variantSelector.groups.${groupIndex}.label`,
      ),
      displayType,
      required: group.required !== false,
      order: Number(group.order),
      ...(stringValue(group.placeholder)
        ? { placeholder: stringValue(group.placeholder) }
        : {}),
      ...(stringValue(group.description)
        ? { description: stringValue(group.description) }
        : {}),
      options,
    };
  });
  assertUniqueOrder(groups, "variantSelector.groups");

  if (enabled && groups.length === 0) {
    throw new VariantSelectorValidationError(
      "variantSelector.groups",
      "برای فعال‌سازی انتخاب‌گر سفارشی حداقل یک گروه لازم است.",
    );
  }
  for (const [index, group] of groups.entries()) {
    if (enabled && group.options.length === 0) {
      throw new VariantSelectorValidationError(
        `variantSelector.groups.${index}.options`,
        `گروه «${group.label}» باید حداقل یک گزینه داشته باشد.`,
      );
    }
  }

  const validVariantIds = new Set(
    variants.map((variant) => String(variant._id || "").toLowerCase()).filter(Boolean),
  );
  const optionIdsByGroup = new Map(
    groups.map((group) => [group.id, new Set(group.options.map((option) => option.id))]),
  );
  const seenVariantIds = new Set<string>();
  const seenCombinations = new Set<string>();
  const rawMappings = Array.isArray(raw.mappings) ? raw.mappings : [];

  const mappings = rawMappings.map((item, mappingIndex) => {
    if (!item || typeof item !== "object") {
      throw new VariantSelectorValidationError(
        `variantSelector.mappings.${mappingIndex}`,
        "ساختار اتصال مدل نامعتبر است.",
      );
    }
    const mapping = item as Record<string, unknown>;
    const variantId = stringValue(mapping.variantId).toLowerCase();
    if (!validVariantIds.has(variantId)) {
      throw new VariantSelectorValidationError(
        `variantSelector.mappings.${mappingIndex}.variantId`,
        "مدل متصل‌شده حذف شده یا به این محصول تعلق ندارد.",
      );
    }
    if (seenVariantIds.has(variantId)) {
      throw new VariantSelectorValidationError(
        `variantSelector.mappings.${mappingIndex}.variantId`,
        "هر مدل فقط می‌تواند یک اتصال داشته باشد.",
      );
    }
    seenVariantIds.add(variantId);

    const rawOptionIds =
      mapping.optionIds && typeof mapping.optionIds === "object"
        ? (mapping.optionIds as Record<string, unknown>)
        : {};
    const optionIds: Record<string, string> = {};
    for (const group of groups) {
      const optionId = stringValue(rawOptionIds[group.id]);
      if (!optionId) {
        if (group.required) {
          throw new VariantSelectorValidationError(
            `variantSelector.mappings.${mappingIndex}.optionIds.${group.id}`,
            `انتخاب «${group.label}» برای این مدل الزامی است.`,
          );
        }
        continue;
      }
      if (!optionIdsByGroup.get(group.id)?.has(optionId)) {
        throw new VariantSelectorValidationError(
          `variantSelector.mappings.${mappingIndex}.optionIds.${group.id}`,
          `گزینه انتخاب‌شده برای «${group.label}» حذف شده یا نامعتبر است.`,
        );
      }
      optionIds[group.id] = optionId;
    }

    const combinationKey = groups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => `${group.id}:${optionIds[group.id] || ""}`)
      .join("|");
    if (seenCombinations.has(combinationKey)) {
      throw new VariantSelectorValidationError(
        `variantSelector.mappings.${mappingIndex}.optionIds`,
        "این ترکیب گزینه‌ها قبلاً به مدل دیگری متصل شده است.",
      );
    }
    seenCombinations.add(combinationKey);
    return { variantId, optionIds };
  });

  if (enabled && status === "published") {
    const unmapped = variants.filter(
      (variant) =>
        variant.isActive !== false &&
        !seenVariantIds.has(String(variant._id || "").toLowerCase()),
    );
    if (unmapped.length > 0) {
      throw new VariantSelectorValidationError(
        "variantSelector.mappings",
        `مدل‌های فعال بدون اتصال: ${unmapped.map((variant) => variant.title).join("، ")}`,
      );
    }
  }

  return { enabled, version: 1, groups, mappings };
}

export function sortedSelectorGroups(config?: VariantSelectorConfig) {
  return (config?.groups || [])
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((group) => ({
      ...group,
      options: group.options.slice().sort((left, right) => left.order - right.order),
    }));
}

export function resolveVariantId(
  config: VariantSelectorConfig | undefined,
  selections: Record<string, string>,
) {
  if (!config?.enabled) return undefined;
  const groups = sortedSelectorGroups(config);
  const complete = groups.every(
    (group) => !group.required || Boolean(selections[group.id]),
  );
  if (!complete) return undefined;
  return config.mappings.find((mapping) =>
    groups.every(
      (group) => (mapping.optionIds[group.id] || "") === (selections[group.id] || ""),
    ),
  )?.variantId;
}

export function getAvailableOptionIds(
  config: VariantSelectorConfig,
  groupId: string,
  selections: Record<string, string>,
) {
  const groups = sortedSelectorGroups(config);
  const groupIndex = groups.findIndex((group) => group.id === groupId);
  if (groupIndex < 0) return new Set<string>();
  const previousGroups = groups.slice(0, groupIndex);
  if (
    previousGroups.some(
      (group) => group.required && !selections[group.id],
    )
  ) {
    return new Set<string>();
  }
  const matchingMappings = config.mappings.filter((mapping) =>
    previousGroups.every(
      (group) =>
        !selections[group.id] || mapping.optionIds[group.id] === selections[group.id],
    ),
  );
  return new Set(
    matchingMappings
      .map((mapping) => mapping.optionIds[groupId])
      .filter((value): value is string => Boolean(value)),
  );
}

export function getVariantAttributeSelections(
  config: VariantSelectorConfig | undefined,
  variantId: string,
): VariantAttributeSelection[] {
  if (!config?.enabled) return [];
  const mapping = config.mappings.find(
    (item) => String(item.variantId) === String(variantId),
  );
  if (!mapping) return [];
  return sortedSelectorGroups(config).flatMap((group) => {
    const optionId = mapping.optionIds[group.id];
    const option = group.options.find((item) => item.id === optionId);
    return option
      ? [{
          groupId: group.id,
          key: group.key,
          label: group.label,
          optionId,
          optionLabel: option.label,
        }]
      : [];
  });
}

export function selectionsForVariant(
  config: VariantSelectorConfig | undefined,
  variantId: string,
) {
  const mapping = config?.mappings.find(
    (item) => String(item.variantId) === String(variantId),
  );
  return mapping ? { ...mapping.optionIds } : {};
}

export function isVariantMappedForSale(
  config: VariantSelectorConfig | undefined,
  variantId: string,
) {
  return (
    !config?.enabled ||
    config.mappings.some(
      (mapping) => String(mapping.variantId) === String(variantId),
    )
  );
}

// Stock does not change the default price: an unavailable cheapest model stays
// selected and the purchase controls show its availability.
export function getDefaultVariant(
  variants: readonly ProductVariant[],
  config?: VariantSelectorConfig,
  preferredVariantId?: string,
): ProductVariant | undefined {
  let cheapest: ProductVariant | undefined;
  let lowestPrice = Infinity;
  for (const variant of variants) {
    const price = Number(variant.discountPrice ?? variant.price);
    if (
      variant.isActive === false ||
      !Number.isFinite(price) || price < 0 ||
      !isVariantMappedForSale(config, String(variant._id))
    ) continue;

    // A link to a specific model represents an explicit customer choice.
    if (preferredVariantId && String(variant._id) === preferredVariantId) {
      return variant;
    }
    if (price < lowestPrice) {
      cheapest = variant;
      lowestPrice = price;
    }
  }
  return cheapest;
}

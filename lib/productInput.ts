import mongoose from "mongoose";
import {
  normalizeVariantSelector,
  VariantSelectorValidationError,
} from "@/lib/variantSelector";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export type ProductInputMode = "create" | "update";

export type BuildProductInputOptions = {
  mode: ProductInputMode;
  productId?: string;
  existingVariantIds?: readonly string[];
  existingDefaultVariantId?: string | null;
};

export type ProductVariantWriteInput = {
  _id?: string;
  title: string;
  sku?: string;
  barcode?: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  isActive: boolean;
};

export class ProductInputValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ProductInputValidationError";
    this.field = field;
  }
}

export function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function requireNonNegativeSafeInteger(
  value: unknown,
  field: string,
): number {
  if (!isNonNegativeSafeInteger(value)) {
    throw new ProductInputValidationError(
      field,
      `${field} باید عدد صحیح، نامنفی و در محدوده امن JavaScript باشد.`,
    );
  }

  return value;
}

export function optionalDiscount(
  value: unknown,
  price: number,
  field: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const discount = requireNonNegativeSafeInteger(value, field);
  if (discount > price) {
    throw new ProductInputValidationError(
      field,
      `${field} نمی‌تواند بیشتر از قیمت باشد.`,
    );
  }

  return discount;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProductInputValidationError(field, `${field} الزامی است.`);
  }

  return value.trim();
}

function normalizeVariants(
  rawVariants: unknown,
  productType: "single" | "multi",
  status: "draft" | "published",
  options: BuildProductInputOptions,
): { variants: ProductVariantWriteInput[]; removedVariantIds: string[] } {
  if (productType === "single") {
    const existingVariantIds = (options.existingVariantIds ?? []).map((id) =>
      id.toLowerCase(),
    );
    return {
      variants: [],
      removedVariantIds: existingVariantIds,
    };
  }

  if (!Array.isArray(rawVariants) || rawVariants.length === 0) {
    throw new ProductInputValidationError(
      "variants",
      "محصول چند مدلی باید حداقل دارای یک مدل باشد.",
    );
  }

  const existingVariantIds = new Set(
    (options.existingVariantIds ?? []).map((id) => id.toLowerCase()),
  );
  const acceptedVariantIds = new Set<string>();
  const seenSkus = new Set<string>();
  const seenBarcodes = new Set<string>();

  const normalized = rawVariants.map((rawVariant, index) => {
    if (!rawVariant || typeof rawVariant !== "object") {
      throw new ProductInputValidationError(
        `variants.${index}`,
        "ساختار مدل محصول نامعتبر است.",
      );
    }

    const variant = rawVariant as Record<string, unknown>;
    const rawId = variant._id;
    let variantId: string;

    if (rawId !== null && rawId !== undefined && rawId !== "") {
      if (typeof rawId !== "string" || !OBJECT_ID_PATTERN.test(rawId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه مدل محصول نامعتبر است.",
        );
      }

      variantId = rawId.toLowerCase();

      if (options.mode === "update" && !existingVariantIds.has(variantId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه مدل جدید نباید توسط کاربر تعیین شود.",
        );
      }

      if (acceptedVariantIds.has(variantId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه مدل محصول تکراری است.",
        );
      }

      acceptedVariantIds.add(variantId);
    } else {
      variantId = new mongoose.Types.ObjectId().toString();
      acceptedVariantIds.add(variantId);
    }

    const title = requiredString(variant.title, `variants.${index}.title`);
    const price = requireNonNegativeSafeInteger(
      variant.price,
      `variants.${index}.price`,
    );
    const discountPrice = optionalDiscount(
      variant.discountPrice,
      price,
      `variants.${index}.discountPrice`,
    );
    const stock = requireNonNegativeSafeInteger(
      variant.stock,
      `variants.${index}.stock`,
    );
    const sku = optionalString(variant.sku);
    const barcode = optionalString(variant.barcode);
    const isActive = variant.isActive !== false;

    if (sku) {
      const lowerSku = sku.toLowerCase();
      if (seenSkus.has(lowerSku)) {
        throw new ProductInputValidationError(
          `variants.${index}.sku`,
          `کد SKU مدل (${sku}) در این محصول تکراری است.`,
        );
      }
      seenSkus.add(lowerSku);
    }

    if (barcode) {
      const normalizedBarcode = barcode.toLowerCase();
      if (seenBarcodes.has(normalizedBarcode)) {
        throw new ProductInputValidationError(
          `variants.${index}.barcode`,
          `بارکد مدل (${barcode}) در این محصول تکراری است.`,
        );
      }
      seenBarcodes.add(normalizedBarcode);
    }

    return {
      _id: variantId,
      title,
      ...(sku ? { sku } : {}),
      ...(barcode ? { barcode } : {}),
      price,
      discountPrice,
      stock,
      isActive,
    };
  });

  const activeVariants = normalized.filter((v) => v.isActive);
  if (status === "published" && activeVariants.length === 0) {
    throw new ProductInputValidationError(
      "variants",
      "محصول چند مدلی برای انتشار باید حداقل یک مدل فعال داشته باشد.",
    );
  }

  const removedVariantIds = [...existingVariantIds].filter(
    (id) => !acceptedVariantIds.has(id),
  );

  return {
    variants: normalized,
    removedVariantIds,
  };
}

export function calculateDerivedStock(
  variants: readonly ProductVariantWriteInput[],
): number {
  let total = 0;
  for (const variant of variants) {
    if (variant.isActive !== false) {
      total += variant.stock;
      if (!Number.isSafeInteger(total)) {
        throw new ProductInputValidationError(
          "stock",
          "مجموع موجودی مدل‌ها از محدوده عدد صحیح امن خارج است.",
        );
      }
    }
  }
  return total;
}

export function calculateDerivedPricing(
  variants: readonly ProductVariantWriteInput[],
): { price: number; discountPrice: number | null } {
  const activeVariants = variants.filter((v) => v.isActive !== false);
  if (activeVariants.length === 0) {
    return { price: 0, discountPrice: null };
  }

  const minBasePrice = Math.min(...activeVariants.map((v) => v.price));
  const minEffectivePrice = Math.min(
    ...activeVariants.map((v) => v.discountPrice ?? v.price),
  );

  return {
    price: minBasePrice,
    discountPrice: minEffectivePrice < minBasePrice ? minEffectivePrice : null,
  };
}

function normalizeImages(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((image) => {
      if (typeof image === "string" && image.trim()) {
        return { url: image.trim(), alt: "" };
      }
      if (!image || typeof image !== "object") return null;
      const item = image as Record<string, unknown>;
      if (typeof item.url !== "string" || !item.url.trim()) return null;
      return {
        url: item.url.trim(),
        alt: typeof item.alt === "string" ? item.alt : "",
      };
    })
    .filter((image): image is { url: string; alt: string } => image !== null);
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (faq): faq is Record<string, unknown> =>
        Boolean(faq) && typeof faq === "object",
    )
    .map((faq) => ({
      question: requiredString(faq.question, "faqs.question"),
      answer: requiredString(faq.answer, "faqs.answer"),
    }));
}

export function buildProductWriteInput(
  rawBody: unknown,
  options: BuildProductInputOptions,
) {
  if (!rawBody || typeof rawBody !== "object") {
    throw new ProductInputValidationError("body", "بدنه درخواست نامعتبر است.");
  }

  const body = rawBody as Record<string, unknown>;
  if (body._id !== undefined) {
    const submittedId =
      typeof body._id === "string" ? body._id.toLowerCase() : "";
    const expectedId = options.productId?.toLowerCase();
    if (
      options.mode === "create" ||
      !expectedId ||
      submittedId !== expectedId
    ) {
      throw new ProductInputValidationError(
        "_id",
        "شناسه محصول قابل تزریق یا تغییر نیست.",
      );
    }
  }

  const status: "draft" | "published" =
    body.status === "published" ? "published" : "draft";
  const productType: "single" | "multi" =
    body.productType === "multi" ? "multi" : "single";

  const { variants, removedVariantIds } = normalizeVariants(
    body.variants,
    productType,
    status,
    options,
  );

  let price: number;
  let discountPrice: number | null;
  let stock: number;

  if (productType === "multi") {
    stock = calculateDerivedStock(variants);
    const derivedPricing = calculateDerivedPricing(variants);
    price = derivedPricing.price;
    discountPrice = derivedPricing.discountPrice;
  } else {
    price = requireNonNegativeSafeInteger(body.price, "price");
    discountPrice = optionalDiscount(body.discountPrice, price, "discountPrice");
    stock = requireNonNegativeSafeInteger(body.stock, "stock");
  }

  let defaultVariantId: string | null = null;
  if (productType === "multi") {
    const rawDefaultVariantId = body.defaultVariantId;
    let requestedDefaultVariantId: string | null = null;

    if (rawDefaultVariantId === undefined && options.mode === "update") {
      requestedDefaultVariantId = options.existingDefaultVariantId ?? null;
    } else if (
      rawDefaultVariantId !== undefined &&
      rawDefaultVariantId !== null &&
      rawDefaultVariantId !== ""
    ) {
      if (
        typeof rawDefaultVariantId !== "string" ||
        !OBJECT_ID_PATTERN.test(rawDefaultVariantId)
      ) {
        throw new ProductInputValidationError(
          "defaultVariantId",
          "شناسه مدل پیش‌فرض نامعتبر است.",
        );
      }
      requestedDefaultVariantId = rawDefaultVariantId.toLowerCase();
    }

    const activeVariantIds = new Set(
      variants
        .filter((variant) => variant.isActive !== false)
        .map((variant) => String(variant._id).toLowerCase()),
    );
    if (
      requestedDefaultVariantId &&
      !activeVariantIds.has(requestedDefaultVariantId.toLowerCase())
    ) {
      throw new ProductInputValidationError(
        "defaultVariantId",
        "مدل پیش‌فرض باید یکی از مدل‌های فعال محصول باشد.",
      );
    }

    defaultVariantId =
      requestedDefaultVariantId ?? activeVariantIds.values().next().value ?? null;
  }

  const sku = optionalString(body.sku);
  const barcode =
    productType === "multi"
      ? null
      : options.mode === "update" && body.barcode === undefined
        ? undefined
        : optionalString(body.barcode) ?? null;

  if (
    sku &&
    variants.some(
      (variant) => variant.sku?.toLowerCase() === sku.toLowerCase(),
    )
  ) {
    throw new ProductInputValidationError(
      "sku",
      "SKU محصول نمی‌تواند با SKU یکی از مدل‌های همان محصول تکراری باشد.",
    );
  }

  let variantSelector;
  try {
    variantSelector =
      productType === "multi"
        ? normalizeVariantSelector(body.variantSelector, variants, status)
        : undefined;
  } catch (error) {
    if (error instanceof VariantSelectorValidationError) {
      throw new ProductInputValidationError(error.field, error.message);
    }
    throw error;
  }

  const productData = {
    status,
    productType,
    variants,
    variantSelector,
    defaultVariantId,
    sku,
    ...(barcode !== undefined ? { barcode } : {}),
    title: requiredString(body.title, "title"),
    slug: requiredString(body.slug, "slug"),
    description: optionalString(body.description),
    shortDesc: optionalString(body.shortDesc),
    price,
    discountPrice,
    stock,
    brand: optionalString(body.brand),
    seoTitle: optionalString(body.seoTitle),
    metaDescription: optionalString(body.metaDescription),
    mainImageAlt: optionalString(body.mainImageAlt),
    mainImage: requiredString(body.mainImage, "mainImage"),
    images: normalizeImages(body.galleryImages ?? body.images),
    specifications: Array.isArray(body.specifications)
      ? body.specifications
      : [],
    faqs: normalizeFaqs(body.faqs),
  };

  return { productData, removedVariantIds };
}

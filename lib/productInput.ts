const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

type ProductInputMode = "create" | "update";

type BuildProductInputOptions = {
  mode: ProductInputMode;
  productId?: string;
  existingVariantIds?: readonly string[];
};

type ProductVariantInput = {
  _id?: string;
  title: string;
  sku?: string;
  price: number;
  discountPrice: number | null;
  stock: number;
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

function requireNonNegativeSafeInteger(value: unknown, field: string): number {
  if (!isNonNegativeSafeInteger(value)) {
    throw new ProductInputValidationError(
      field,
      `${field} باید عدد صحیح، نامنفی و در محدوده امن JavaScript باشد.`,
    );
  }

  return value;
}

function optionalDiscount(
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

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ProductInputValidationError(field, `${field} الزامی است.`);
  }

  return value.trim();
}

function normalizeVariants(
  rawVariants: unknown,
  productType: "single" | "multi",
  options: BuildProductInputOptions,
): { variants: ProductVariantInput[]; removedVariantIds: string[] } {
  const existingVariantIds = new Set(
    (options.existingVariantIds ?? []).map((id) => id.toLowerCase()),
  );
  const acceptedVariantIds = new Set<string>();
  const inputVariants = Array.isArray(rawVariants) ? rawVariants : [];

  if (productType === "multi" && !Array.isArray(rawVariants)) {
    throw new ProductInputValidationError(
      "variants",
      "لیست تنوع‌های محصول چندحالته الزامی است.",
    );
  }

  const normalized = inputVariants.map((rawVariant, index) => {
    if (!rawVariant || typeof rawVariant !== "object") {
      throw new ProductInputValidationError(
        `variants.${index}`,
        "ساختار تنوع محصول نامعتبر است.",
      );
    }

    const variant = rawVariant as Record<string, unknown>;
    const rawId = variant._id;
    let variantId: string | undefined;

    if (rawId !== null && rawId !== undefined && rawId !== "") {
      if (typeof rawId !== "string" || !OBJECT_ID_PATTERN.test(rawId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه تنوع محصول نامعتبر است.",
        );
      }

      variantId = rawId.toLowerCase();
      if (options.mode === "create" || !existingVariantIds.has(variantId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه تنوع محصول به این محصول تعلق ندارد.",
        );
      }

      if (acceptedVariantIds.has(variantId)) {
        throw new ProductInputValidationError(
          `variants.${index}._id`,
          "شناسه تنوع محصول تکراری است.",
        );
      }

      acceptedVariantIds.add(variantId);
    }

    const price = requireNonNegativeSafeInteger(
      variant.price,
      `variants.${index}.price`,
    );
    const sku = optionalString(variant.sku);

    return {
      ...(variantId ? { _id: variantId } : {}),
      title: requiredString(variant.title, `variants.${index}.title`),
      ...(sku ? { sku } : {}),
      price,
      discountPrice: optionalDiscount(
        variant.discountPrice,
        price,
        `variants.${index}.discountPrice`,
      ),
      stock: requireNonNegativeSafeInteger(
        variant.stock,
        `variants.${index}.stock`,
      ),
    };
  });

  const removedVariantIds = [...existingVariantIds].filter(
    (id) => !acceptedVariantIds.has(id),
  );

  return {
    variants: productType === "multi" ? normalized : [],
    removedVariantIds,
  };
}

function sumVariantStock(variants: readonly ProductVariantInput[]): number {
  let total = 0;
  for (const variant of variants) {
    total += variant.stock;
    if (!Number.isSafeInteger(total)) {
      throw new ProductInputValidationError(
        "stock",
        "مجموع موجودی تنوع‌ها از محدوده عدد صحیح امن خارج است.",
      );
    }
  }
  return total;
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
    if (options.mode === "create" || !expectedId || submittedId !== expectedId) {
      throw new ProductInputValidationError(
        "_id",
        "شناسه محصول قابل تزریق یا تغییر نیست.",
      );
    }
  }

  const productType = body.productType === "multi" ? "multi" : "single";
  const { variants, removedVariantIds } = normalizeVariants(
    body.variants,
    productType,
    options,
  );
  const price = requireNonNegativeSafeInteger(body.price, "price");
  const stock =
    productType === "multi"
      ? sumVariantStock(variants)
      : requireNonNegativeSafeInteger(body.stock, "stock");

  const productData = {
    status: body.status === "published" ? "published" : "draft",
    productType,
    variants,
    title: requiredString(body.title, "title"),
    slug: requiredString(body.slug, "slug"),
    description: optionalString(body.description),
    shortDesc: optionalString(body.shortDesc),
    price,
    discountPrice: optionalDiscount(body.discountPrice, price, "discountPrice"),
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

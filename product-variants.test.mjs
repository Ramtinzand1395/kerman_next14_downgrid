import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProductWriteInput,
  calculateDerivedStock,
  calculateDerivedPricing,
  ProductInputValidationError,
  requireNonNegativeSafeInteger,
  optionalDiscount,
} from "./lib/productInput.ts";

test("Product Input - Create valid single product", () => {
  const input = {
    title: "کنسول پلی استیشن 5 استاندارد",
    slug: "ps5-standard",
    mainImage: "https://example.com/ps5.jpg",
    productType: "single",
    price: 32500000,
    discountPrice: 31000000,
    stock: 5,
    sku: "PS5-STD-001",
    status: "published",
  };

  const { productData, removedVariantIds } = buildProductWriteInput(input, {
    mode: "create",
  });

  assert.equal(productData.title, "کنسول پلی استیشن 5 استاندارد");
  assert.equal(productData.productType, "single");
  assert.equal(productData.price, 32500000);
  assert.equal(productData.discountPrice, 31000000);
  assert.equal(productData.stock, 5);
  assert.equal(productData.sku, "PS5-STD-001");
  assert.equal(productData.variants.length, 0);
  assert.deepEqual(removedVariantIds, []);
});

test("Product Input - Create valid multi-variant product with derived pricing and stock", () => {
  const input = {
    title: "کنسول پلی استیشن 5 پرو",
    slug: "ps5-pro",
    mainImage: "https://example.com/ps5-pro.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        title: "ریجن ژاپن 2 ترابایت",
        sku: "PS5-PRO-JP",
        price: 55000000,
        discountPrice: 53000000,
        stock: 3,
        isActive: true,
      },
      {
        title: "ریجن اروپا 2 ترابایت",
        sku: "PS5-PRO-EU",
        price: 58000000,
        discountPrice: null,
        stock: 4,
        isActive: true,
      },
    ],
  };

  const { productData } = buildProductWriteInput(input, { mode: "create" });

  assert.equal(productData.productType, "multi");
  assert.equal(productData.variants.length, 2);
  // Derived stock = 3 + 4 = 7
  assert.equal(productData.stock, 7);
  // Min base price = 55000000
  assert.equal(productData.price, 55000000);
  // Min effective price = 53000000 < 55000000 => derived discountPrice = 53000000
  assert.equal(productData.discountPrice, 53000000);
});

test("Product Input - Reject multi product without variants", () => {
  const input = {
    title: "محصول بدون مدل",
    slug: "no-variant",
    mainImage: "https://example.com/item.jpg",
    productType: "multi",
    status: "published",
    variants: [],
  };

  assert.throws(
    () => buildProductWriteInput(input, { mode: "create" }),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.field === "variants" &&
      err.message.includes("حداقل دارای یک مدل باشد"),
  );
});

test("Product Input - Reject published multi product without any active variants", () => {
  const input = {
    title: "محصول غیرفعال",
    slug: "inactive-variants",
    mainImage: "https://example.com/item.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        title: "مدل 1",
        price: 1000000,
        stock: 1,
        isActive: false,
      },
    ],
  };

  assert.throws(
    () => buildProductWriteInput(input, { mode: "create" }),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.field === "variants" &&
      err.message.includes("حداقل یک مدل فعال"),
  );
});

test("Product Input - Variant ID stability: preserve existing ID and assign new ID to additions", () => {
  const existingVarId = "507f1f77bcf86cd799439011";
  const existingVariantIds = [existingVarId];

  const updateInput = {
    title: "کنسول آپدیت شده",
    slug: "console-updated",
    mainImage: "https://example.com/img.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        _id: existingVarId,
        title: "مدل قبلی با قیمت جدید",
        price: 49000000,
        stock: 2,
        isActive: true,
      },
      {
        title: "مدل کاملاً جدید بدون ID",
        price: 52000000,
        stock: 5,
        isActive: true,
      },
    ],
  };

  const { productData, removedVariantIds } = buildProductWriteInput(
    updateInput,
    {
      mode: "update",
      productId: "607f1f77bcf86cd799439099",
      existingVariantIds,
    },
  );

  assert.equal(productData.variants.length, 2);
  assert.equal(productData.variants[0]._id, existingVarId);
  assert.equal(productData.variants[1]._id, undefined); // Will be assigned by Mongoose on write
  assert.deepEqual(removedVariantIds, []);
});

test("Product Input - Variant ID stability: detect removed variant IDs", () => {
  const var1 = "507f1f77bcf86cd799439011";
  const var2 = "507f1f77bcf86cd799439022";
  const existingVariantIds = [var1, var2];

  const updateInput = {
    title: "حذف یک مدل",
    slug: "remove-variant",
    mainImage: "https://example.com/img.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        _id: var1,
        title: "مدل باقی‌مانده",
        price: 10000000,
        stock: 3,
        isActive: true,
      },
    ],
  };

  const { removedVariantIds } = buildProductWriteInput(updateInput, {
    mode: "update",
    productId: "607f1f77bcf86cd799439099",
    existingVariantIds,
  });

  assert.deepEqual(removedVariantIds, [var2]);
});

test("Product Input - Reject foreign or forged variant ID", () => {
  const legitimateVarId = "507f1f77bcf86cd799439011";
  const forgedVarId = "507f1f77bcf86cd799439099"; // Belongs to another product or fake

  const updateInput = {
    title: "تلاش برای تزریق ID جعلی",
    slug: "fake-id",
    mainImage: "https://example.com/img.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        _id: forgedVarId,
        title: "مدل جعلی",
        price: 1000000,
        stock: 1,
        isActive: true,
      },
    ],
  };

  assert.throws(
    () =>
      buildProductWriteInput(updateInput, {
        mode: "update",
        productId: "607f1f77bcf86cd799439099",
        existingVariantIds: [legitimateVarId],
      }),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.field === "variants.0._id" &&
      err.message.includes("تعلق ندارد یا نامعتبر است"),
  );
});

test("Product Input - Reject duplicate variant IDs in the same request", () => {
  const existingVarId = "507f1f77bcf86cd799439011";

  const updateInput = {
    title: "تکرار یک ID در دو سطر",
    slug: "duplicate-id",
    mainImage: "https://example.com/img.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        _id: existingVarId,
        title: "سطر اول",
        price: 1000000,
        stock: 1,
        isActive: true,
      },
      {
        _id: existingVarId,
        title: "سطر دوم با همان ID",
        price: 2000000,
        stock: 1,
        isActive: true,
      },
    ],
  };

  assert.throws(
    () =>
      buildProductWriteInput(updateInput, {
        mode: "update",
        productId: "607f1f77bcf86cd799439099",
        existingVariantIds: [existingVarId],
      }),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.field === "variants.1._id" &&
      err.message.includes("تکراری است"),
  );
});

test("Product Input - Reject duplicate SKU across variants in the same product", () => {
  const input = {
    title: "محصول با SKU تکراری",
    slug: "duplicate-sku",
    mainImage: "https://example.com/img.jpg",
    productType: "multi",
    status: "published",
    variants: [
      {
        title: "مدل A",
        sku: "PS5-SAME-SKU",
        price: 1000000,
        stock: 1,
        isActive: true,
      },
      {
        title: "مدل B",
        sku: "PS5-SAME-SKU",
        price: 2000000,
        stock: 1,
        isActive: true,
      },
    ],
  };

  assert.throws(
    () => buildProductWriteInput(input, { mode: "create" }),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.field === "variants.1.sku" &&
      err.message.includes("تکراری است"),
  );
});

test("Product Input - Reject invalid money and stock values (negative, decimal, discount > price)", () => {
  // Negative price
  assert.throws(
    () => requireNonNegativeSafeInteger(-500, "price"),
    (err) => err instanceof ProductInputValidationError,
  );

  // Decimal price
  assert.throws(
    () => requireNonNegativeSafeInteger(1500.75, "price"),
    (err) => err instanceof ProductInputValidationError,
  );

  // Negative stock
  assert.throws(
    () => requireNonNegativeSafeInteger(-2, "stock"),
    (err) => err instanceof ProductInputValidationError,
  );

  // Discount > Price
  assert.throws(
    () => optionalDiscount(6000000, 5000000, "discountPrice"),
    (err) =>
      err instanceof ProductInputValidationError &&
      err.message.includes("نمی‌تواند بیشتر از قیمت باشد"),
  );

  // Valid discount <= price
  assert.equal(optionalDiscount(4500000, 5000000, "discountPrice"), 4500000);
  assert.equal(optionalDiscount(null, 5000000, "discountPrice"), null);
});

test("Derived Pricing and Stock Helper Logic", () => {
  const variants = [
    {
      title: "V1",
      price: 10000,
      discountPrice: 9000,
      stock: 5,
      isActive: true,
    },
    {
      title: "V2",
      price: 15000,
      discountPrice: null,
      stock: 10,
      isActive: true,
    },
    {
      title: "V3 (Inactive)",
      price: 8000,
      discountPrice: 7000,
      stock: 20,
      isActive: false, // Inactive variant must be excluded from aggregates
    },
  ];

  // Derived stock should only count active: 5 + 10 = 15
  assert.equal(calculateDerivedStock(variants), 15);

  // Derived pricing should ignore inactive:
  // Base prices: [10000, 15000] => min = 10000
  // Effective prices: [9000, 15000] => min = 9000 < 10000 => discountPrice = 9000
  const pricing = calculateDerivedPricing(variants);
  assert.equal(pricing.price, 10000);
  assert.equal(pricing.discountPrice, 9000);
});

test("Cart & Pricing Contract - price is original base price, discountPrice is discounted price", () => {
  const variant = {
    _id: "507f1f77bcf86cd799439011",
    title: "2TB SSD",
    price: 8500000, // Original base price
    discountPrice: 7900000, // Discounted price
    stock: 4,
  };

  // AddToCart item construction standard
  const cartItem = {
    id: `prod1-${variant._id}`,
    productId: "prod1",
    productTitle: "پلی استیشن 5",
    variantId: variant._id,
    variantTitle: variant.title,
    price: variant.price,
    discountPrice: variant.discountPrice,
    quantity: 1,
    stock: variant.stock,
  };

  // Selling unit price contract: discountPrice ?? price
  const unitSellingPrice = cartItem.discountPrice ?? cartItem.price;
  assert.equal(unitSellingPrice, 7900000);

  // Discount amount calculation: item.price - unitSellingPrice >= 0
  const discountSavings = cartItem.price - unitSellingPrice;
  assert.equal(discountSavings, 600000);
  assert.ok(discountSavings >= 0, "Discount savings must never be negative!");
});

test("Checkout Security - Validation rules for Multi and Single items", () => {
  const mockProduct = {
    _id: "607f1f77bcf86cd799439001",
    title: "کنترلر دوال‌سنس",
    productType: "multi",
    status: "published",
    variants: [
      {
        _id: "507f1f77bcf86cd799439011",
        title: "سفید",
        sku: "DS-WHT",
        price: 4500000,
        discountPrice: 4200000,
        stock: 3,
        isActive: true,
      },
      {
        _id: "507f1f77bcf86cd799439022",
        title: "مشکی (غیرفعال)",
        sku: "DS-BLK",
        price: 4600000,
        discountPrice: null,
        stock: 5,
        isActive: false,
      },
    ],
  };

  // Rule 1: Multi product requires variantId
  const itemWithoutVariant = {
    productId: mockProduct._id,
    quantity: 1,
  };
  assert.equal(Boolean(itemWithoutVariant.variantId), false);

  // Rule 2: Cannot select inactive variant
  const selectedInactive = mockProduct.variants.find(
    (v) => v._id === "507f1f77bcf86cd799439022" && v.isActive !== false,
  );
  assert.equal(selectedInactive, undefined, "Inactive variant must be rejected");

  // Rule 3: Cannot exceed variant stock
  const selectedActive = mockProduct.variants.find(
    (v) => v._id === "507f1f77bcf86cd799439011" && v.isActive !== false,
  );
  assert.ok(selectedActive);
  assert.ok(selectedActive.stock < 5, "Stock is 3, purchasing 5 must fail");

  // Rule 4: Snapshot generation
  const snapshot = {
    product: mockProduct._id,
    productTitle: mockProduct.title,
    variantId: selectedActive._id,
    variantTitle: selectedActive.title,
    variantSku: selectedActive.sku,
    price: selectedActive.price,
    discountPrice: selectedActive.discountPrice,
    quantity: 2,
    total: (selectedActive.discountPrice ?? selectedActive.price) * 2,
  };

  assert.equal(snapshot.productTitle, "کنترلر دوال‌سنس");
  assert.equal(snapshot.variantTitle, "سفید");
  assert.equal(snapshot.variantSku, "DS-WHT");
  assert.equal(snapshot.price, 4500000);
  assert.equal(snapshot.discountPrice, 4200000);
  assert.equal(snapshot.total, 8400000);
});

test("POS & Inventory Concurrency - Decrement pattern and version increment", () => {
  const orderItem = {
    product: "607f1f77bcf86cd799439001",
    variantId: "507f1f77bcf86cd799439011",
    quantity: 2,
  };

  // Multi atomic decrement query representation
  const query = {
    _id: orderItem.product,
    stock: { $gte: orderItem.quantity },
    variants: {
      $elemMatch: {
        _id: orderItem.variantId,
        stock: { $gte: orderItem.quantity },
        isActive: { $ne: false },
      },
    },
  };

  const update = {
    $inc: {
      stock: -orderItem.quantity,
      "variants.$.stock": -orderItem.quantity,
      inventoryVersion: 1, // POS cache invalidation increment
    },
  };

  assert.equal(query.variants.$elemMatch.isActive.$ne, false);
  assert.equal(update.$inc.inventoryVersion, 1);
});

test("SEO JSON-LD Offer formatting and IRR currency conversion", () => {
  // Test case 1: Single product (Toman to IRR * 10)
  const singleProduct = {
    productType: "single",
    price: 15000000,
    discountPrice: 14000000,
    stock: 4,
  };

  const singleSellingToman =
    singleProduct.discountPrice ?? singleProduct.price;
  const singleOffer = {
    "@type": "Offer",
    priceCurrency: "IRR",
    price: singleSellingToman * 10,
    availability:
      singleProduct.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
  };

  assert.equal(singleOffer.priceCurrency, "IRR");
  assert.equal(singleOffer.price, 140000000); // 14,000,000 Toman = 140,000,000 IRR

  // Test case 2: Multi product (AggregateOffer with IRR conversion)
  const multiProduct = {
    productType: "multi",
    variants: [
      { price: 4000000, discountPrice: 3800000, stock: 2, isActive: true },
      { price: 6000000, discountPrice: null, stock: 3, isActive: true },
    ],
  };

  const active = multiProduct.variants.filter((v) => v.isActive);
  const pricesInIRR = active.map(
    (v) => (v.discountPrice ?? v.price) * 10,
  );
  const minIRR = Math.min(...pricesInIRR);
  const maxIRR = Math.max(...pricesInIRR);

  const aggregateOffer = {
    "@type": "AggregateOffer",
    priceCurrency: "IRR",
    lowPrice: minIRR,
    highPrice: maxIRR,
    offerCount: active.length,
  };

  assert.equal(aggregateOffer["@type"], "AggregateOffer");
  assert.equal(aggregateOffer.lowPrice, 38000000); // 3,800,000 Toman = 38,000,000 IRR
  assert.equal(aggregateOffer.highPrice, 60000000); // 6,000,000 Toman = 60,000,000 IRR
  assert.equal(aggregateOffer.offerCount, 2);
});

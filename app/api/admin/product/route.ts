import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import Category from "@/model/Category";
import { isObjectIdOrHexString } from "mongoose";
import { descendantIds } from "@/lib/catalog/category-seo";
import { NextResponse } from "next/server";
import Comment from "@/model/Comment";
import {
  getPurchasePrice,
  missingPurchasePriceExpression,
  summarizeInventory,
  summarizeProductInventory,
} from "@/lib/product-profit";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { validateCatalogReferences } from "@/lib/catalogReferences";
import { notifyLowInventory } from "@/lib/notifications/events";
import {
  buildProductWriteInput,
  ProductInputValidationError,
} from "@/lib/productInput";
import { findCatalogIdentityConflict } from "@/lib/catalogIdentity";
import { collectCatalogIdentities } from "@/lib/pos/catalog-identities";
import { createProductWithCatalogChange } from "@/lib/pos/catalog-outbox";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "")
    .replace(/[\u0000\u200c]/g, " ")
    .trim()
    .slice(0, 120)
    .trimEnd();
  const stock = searchParams.get("stock");
  const status = searchParams.get("status");
  const categoryId = searchParams.get("category");
  const requestedPage = Number(searchParams.get("page"));
  const limit = 10;
  const filter: Record<string, unknown> = { deletedAt: null };

  if (categoryId && !isObjectIdOrHexString(categoryId)) {
    return NextResponse.json({ error: "دسته‌بندی نامعتبر است" }, { status: 400 });
  }

  await dbConnect();

  if (status === "published") filter.status = "published";
  // Older products without a status are not published in the public catalog.
  if (status === "draft") filter.status = { $ne: "published" };
  if (stock === "in") filter.stock = { $gt: 0 };
  if (stock === "low") filter.stock = { $gt: 0, $lt: 10 };
  if (stock === "out") {
    filter.$nor = [{ stock: { $gt: 0 } }];
  }

  if (query || categoryId) {
    const categories = await Category.find().select("name parent").lean();
    const rows = categories.map((category) => ({
      _id: String(category._id),
      parent: category.parent ? String(category.parent) : null,
      name: String(category.name ?? ""),
    }));

    if (categoryId) {
      filter.category = { $in: descendantIds(categoryId.toLowerCase(), rows) };
    }

    if (query) {
      const search = buildSearchPattern(query);
      const matchingCategories = rows
        .filter((category) => search.test(category.name))
        .flatMap((category) => descendantIds(category._id, rows));

      filter.$or = [
        ...["title", "sku", "barcode", "variants.sku", "variants.barcode"].map(
          (field) => ({ [field]: search }),
        ),
        { category: { $in: [...new Set(matchingCategories)] } },
      ];
    }
  }

  if (searchParams.get("missingPurchasePrice") === "true") {
    filter.$expr = missingPurchasePriceExpression;
  }

  const total = await Product.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const products = await Product.find(filter)
    .select("+purchasePrices")
    .populate({
      path: "category",
      populate: { path: "parent", select: "name slug _id" },
    })
    .populate("tags")
    .populate("specifications")
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const stats =
    searchParams.get("includeStats") === "false" ? undefined : await getProductStats();

  return NextResponse.json({
    products: products.map(({ purchasePrices, ...product }) => {
      const cost = { purchasePrices };
      const { inventoryProfit, missingPurchasePrice } = summarizeProductInventory({ ...product, ...cost });
      return {
        ...product,
        purchasePrice: product.productType === "multi" ? null : getPurchasePrice(cost),
        variants: product.variants?.map((variant: { _id?: unknown }) => ({
          ...variant,
          purchasePrice: getPurchasePrice(cost, variant._id),
        })),
        inventoryProfit,
        missingPurchasePrice,
      };
    }),
    total,
    page,
    totalPages,
    stats,
  }, { headers: { "Cache-Control": "no-store" } });
}

function buildSearchPattern(query: string) {
  const equivalentCharacters: Record<string, string> = {
    ی: "[یيى]",
    ي: "[یيى]",
    ى: "[یيى]",
    ک: "[کك]",
    ك: "[کك]",
  };
  const digits = ["0123456789", "۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩"];
  for (let index = 0; index < 10; index++) {
    const equivalents = digits.map((alphabet) => alphabet[index]);
    for (const digit of equivalents) {
      equivalentCharacters[digit] = `[${equivalents.join("")}]`;
    }
  }

  const source = query
    .split(/\s+/)
    .map((word) =>
      Array.from(word, (character) =>
        equivalentCharacters[character] ??
        character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      ).join(""),
    )
    .join("[\\s\u200c]+");
  return new RegExp(source, "i");
}

async function getProductStats() {
  const [products, comments, verifiedComments] = await Promise.all([
    Product.find({ deletedAt: null })
      .select("price discountPrice stock productType variants purchasePrices")
      .lean(),
    Comment.countDocuments(),
    Comment.countDocuments({ verified: false }),
  ]);
  const inventory = summarizeInventory(products);
  return {
    total: products.length,
    value: inventory.inventoryValue,
    lowStock: inventory.lowStockProducts,
    knownInventoryProfit: inventory.knownInventoryProfit,
    missingPurchasePriceProducts: inventory.missingPurchasePriceProducts,
    comments,
    verifiedComments,
  };
}

export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
  }

  if (session.user.role !== "superadmin") {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
  }

  const generateSKU = () =>
    `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const body = await req.json();
    const catalogReferences = await validateCatalogReferences(
      body?.category,
      body?.tags,
    );
    if (!catalogReferences.ok) {
      return NextResponse.json(
        { error: catalogReferences.error },
        { status: 400 },
      );
    }

    const { productData: validatedProductData, purchasePrices } = buildProductWriteInput(body, {
      mode: "create",
    });

    const productData = {
      ...validatedProductData,
      purchasePrices,
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
      sku: validatedProductData.sku || generateSKU(),
      catalogRevision: 0,
      inventoryVersion: 0,
      deletedAt: null,
    };

    const identityConflict = await findCatalogIdentityConflict(
      collectCatalogIdentities(productData),
    );
    if (identityConflict) {
      return NextResponse.json(
        {
          error:
            identityConflict.kind === "sku"
              ? `SKU (${identityConflict.value}) قبلاً برای محصول دیگری استفاده شده است.`
              : `بارکد (${identityConflict.value}) قبلاً برای محصول دیگری استفاده شده است.`,
        },
        { status: 409 },
      );
    }

    const product = await createProductWithCatalogChange(productData);
    const createdProduct = product;
    if (createdProduct?.status === "published") {
      await notifyLowInventory([createdProduct._id]).catch((error) =>
        console.error("[notifications] product inventory event failed:", error),
      );
    }
    return NextResponse.json({ message: "محصول جدید ساخته شد.", product });
  } catch (err: any) {
    console.error("❌ Product Create Error:", err);

    if (err instanceof ProductInputValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // خطاهای اعتبارسنجی Mongoose را به پیام فارسی تبدیل می‌کنیم
    if (err?.name === "ValidationError" && err?.errors) {
      const fieldNames: Record<string, string> = {
        title: "عنوان محصول",
        slug: "نامک (slug)",
        mainImage: "تصویر اصلی",
        category: "دسته‌بندی",
        price: "قیمت",
        stock: "موجودی",
        brand: "برند",
        description: "توضیحات",
      };

      const messages = Object.values(err.errors).map((e: any) => {
        const label = fieldNames[e.path] || e.path;
        if (e.kind === "required") {
          return `${label} الزامی است`;
        }
        return e.message;
      });

      return NextResponse.json(
        { error: messages.join("، ") },
        { status: 400 },
      );
    }

    // خطای تکراری بودن (مثلاً slug یا sku تکراری)
    if (err?.code === 11000) {
      const field = Object.keys(err?.keyPattern || {})[0];
      const label =
        field === "slug" ? "نامک (slug)" : field === "sku" ? "SKU" : field;
      return NextResponse.json(
        { error: `${label} وارد شده تکراری است.` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "خطا در ذخیره محصول" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/mongodb";
import Product from "@/model/Product";
import { validateCatalogReferences } from "@/lib/catalogReferences";
import { notifyLowInventory } from "@/lib/notifications/events";
import {
  buildProductWriteInput,
  ProductInputValidationError,
} from "@/lib/productInput";
import { findCatalogIdentityConflict } from "@/lib/catalogIdentity";
import {
  collectCatalogIdentities,
  differenceCatalogIdentities,
} from "@/lib/pos/catalog-identities";
import {
  saveProductWithCatalogChange,
  softDeleteProductWithCatalogChange,
} from "@/lib/pos/catalog-outbox";
import { hasInventoryStateChanged } from "@/lib/pos/catalog-changes";
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const { id } = await params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });

    if (session.user.role !== "superadmin")
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });

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
    const product = await Product.findById(id).select("+purchasePrices");
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    const existingVariantIds = (product.variants ?? []).map((variant: any) =>
      String(variant._id),
    );
    const {
      productData: validatedProductData,
      removedVariantIds,
      purchasePrices,
    } = buildProductWriteInput(body, {
      mode: "update",
      categorySlug: catalogReferences.categorySlug,
      previousCondition: product.condition,
      previousReport: product.usedConsole?.toObject({ flattenMaps: true }),
      previousDigital: product.isDigital,
      productId: id,
      existingVariantIds,
      existingPurchasePrices: product.purchasePrices,
      existingDefaultVariantId: product.defaultVariantId
        ? String(product.defaultVariantId)
        : null,
    });

    if (validatedProductData.condition === "used" && !validatedProductData.sku) {
      validatedProductData.sku = product.sku || `SKU-${product._id}`;
    }
    const previousProduct = product.toObject({ depopulate: true });
    const previousStatus = product.status;
    const nextProduct = { ...previousProduct, ...validatedProductData };
    const isStockChanged = hasInventoryStateChanged(
      previousProduct,
      nextProduct,
    );

    const previousCosts: Map<string, number> = product.purchasePrices ?? new Map();
    const costsChanged = previousCosts.size !== Object.keys(purchasePrices).length ||
      Object.entries(purchasePrices).some(([key, value]) => previousCosts.get(key) !== value);

    const productData = {
      ...validatedProductData,
      ...(costsChanged ? { purchasePrices } : {}),
      category: catalogReferences.categoryId,
      tags: catalogReferences.tagIds,
      catalogRevision: (product.catalogRevision ?? 0) + 1,
      ...(isStockChanged
        ? { inventoryVersion: (product.inventoryVersion ?? 0) + 1 }
        : {}),
    };

    const changedIdentities = differenceCatalogIdentities(
      collectCatalogIdentities(productData),
      collectCatalogIdentities(product.toObject()),
    );
    const identityConflict = await findCatalogIdentityConflict(
      changedIdentities,
      id,
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

    if (product.condition === "used" || validatedProductData.condition === "used") {
      const version = product.inventoryVersion ?? 0;
      if (body.expectedInventoryVersion !== undefined && body.expectedInventoryVersion !== version) {
        return NextResponse.json({ error: "موجودی دستگاه تغییر کرده است. فرم را دوباره باز کنید." }, { status: 409 });
      }
      product.$where = { inventoryVersion: version === 0 ? { $in: [0, null] } : version };
    }
    product.$locals.removedVariantIds = removedVariantIds;
    if (productData.stock > 0 || productData.condition !== "used") product.usedUnitSoldAt = undefined;
    product.set(productData);
    const Update = await saveProductWithCatalogChange({
      product,
      previous: previousProduct,
    });

    if (
      Update?.status === "published" &&
      Number(Update.stock) <= 5 &&
      (isStockChanged || previousStatus !== "published")
    ) {
      await notifyLowInventory([Update._id]).catch((error) =>
        console.error("[notifications] product inventory event failed:", error),
      );
    }
    return NextResponse.json(Update);
  } catch (err: any) {
    console.error("❌ Product Update Error:", err);

    if (err?.name === "DocumentNotFoundError" || err?.name === "VersionError") {
      return NextResponse.json({ error: "دستگاه تغییر کرده است. فرم را دوباره باز کنید." }, { status: 409 });
    }
    if (err instanceof ProductInputValidationError) {
      return NextResponse.json({ error: err.message, field: err.field }, { status: 400 });
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
        { error: messages.join("، "), field: Object.keys(err.errors)[0] || "body" },
        { status: 400 },
      );
    }

    // خطای تکراری بودن (مثلاً slug یا sku تکراری)
    if (err?.code === 11000) {
      const field = Object.keys(err?.keyPattern || {})[0];
      const label =
        field === "slug" ? "نامک (slug)" : field === "sku" ? "SKU" : field;
      return NextResponse.json(
        { error: `${label} قبلاً استفاده شده است. مقدار جدیدی وارد کنید.`, field: field || "slug" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "به‌روزرسانی محصول در سرور ناموفق بود. اطلاعات فرم محفوظ است؛ اتصال سرور و پایگاه داده را بررسی کنید یا دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "کاربر وارد نشده" }, { status: 401 });
    }

    if (session.user.role !== "superadmin") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }

    const { id } = await params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json({ error: "آی‌دی نامعتبر است" }, { status: 400 });
    }

    const product = await softDeleteProductWithCatalogChange(id);
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    // Soft deletion deliberately keeps the Product document and every order,
    // payment, coupon, cashback, comment, and favorite reference intact.
    // Public and POS catalog queries exclude deletedAt, while the outbox emits
    // a remove event for already-synced POS clients.
    return NextResponse.json({ success: true, deletedAt: product.deletedAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در حذف محصول" }, { status: 500 });
  }
}

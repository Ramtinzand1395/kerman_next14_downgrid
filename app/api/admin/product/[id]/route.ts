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
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "محصول پیدا نشد" }, { status: 404 });
    }

    const existingVariantIds = (product.variants ?? []).map((variant: any) =>
      String(variant._id),
    );
    const {
      productData: validatedProductData,
      removedVariantIds,
    } = buildProductWriteInput(body, {
      mode: "update",
      productId: id,
      existingVariantIds,
    });

    const previousProduct = product.toObject({ depopulate: true });
    const previousStatus = product.status;
    const nextProduct = { ...previousProduct, ...validatedProductData };
    const isStockChanged = hasInventoryStateChanged(
      previousProduct,
      nextProduct,
    );

    const productData = {
      ...validatedProductData,
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

    product.$locals.removedVariantIds = removedVariantIds;
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
      { error: "خطا در بروزرسانی محصول" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
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

    return NextResponse.json({ success: true, deletedAt: product.deletedAt });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "خطا در حذف محصول" }, { status: 500 });
  }
}

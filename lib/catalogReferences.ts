import mongoose from "mongoose";
import Category from "@/model/Category";
import Tag from "@/model/Tag";

type ValidCatalogReferences = {
  ok: true;
  categoryId: string;
  tagIds: string[];
};

type InvalidCatalogReferences = {
  ok: false;
  error: string;
};

/** Validates and normalizes every foreign key accepted by product writes. */
export async function validateCatalogReferences(
  category: unknown,
  tags: unknown,
): Promise<ValidCatalogReferences | InvalidCatalogReferences> {
  const categoryId = String(category ?? "").trim();
  if (!mongoose.isValidObjectId(categoryId)) {
    return { ok: false, error: "لطفاً یک دسته‌بندی معتبر انتخاب کنید." };
  }

  const tagIds = Array.isArray(tags)
    ? [...new Set(tags.map((tag) => String(tag ?? "").trim()).filter(Boolean))]
    : [];
  if (tagIds.some((tagId) => !mongoose.isValidObjectId(tagId))) {
    return { ok: false, error: "یک یا چند برچسب نامعتبر است." };
  }

  const [categoryExists, existingTagCount] = await Promise.all([
    Category.exists({ _id: categoryId }),
    tagIds.length ? Tag.countDocuments({ _id: { $in: tagIds } }) : 0,
  ]);

  if (!categoryExists) {
    return { ok: false, error: "دسته‌بندی انتخاب‌شده وجود ندارد." };
  }
  if (existingTagCount !== tagIds.length) {
    return { ok: false, error: "یک یا چند برچسب انتخاب‌شده وجود ندارد." };
  }

  return { ok: true, categoryId, tagIds };
}

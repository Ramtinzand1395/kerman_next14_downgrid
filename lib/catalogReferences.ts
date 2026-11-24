import mongoose from "mongoose";
import Category from "@/model/Category";
import Tag from "@/model/Tag";
import { isConsoleGeneration, syncUsedConsoleTags, removeUsedConditionTag } from "@/lib/used-console";

type ValidCatalogReferences = {
  ok: true;
  categoryId: string;
  categorySlug: string;
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
    Category.findById(categoryId).select("slug").lean(),
    tagIds.length ? Tag.countDocuments({ _id: { $in: tagIds } }) : 0,
  ]);

  if (!categoryExists) {
    return { ok: false, error: "دسته‌بندی انتخاب‌شده وجود ندارد." };
  }
  if (existingTagCount !== tagIds.length) {
    return { ok: false, error: "یک یا چند برچسب انتخاب‌شده وجود ندارد." };
  }

  return { ok: true, categoryId, categorySlug: String(categoryExists.slug), tagIds };
}


/** Resolve the same automatic tags at the API boundary, not only in the UI.
 * Existing tag records are reused; saving a product never silently creates tags.
 */
export async function resolveUsedConsoleTagIds(
  categorySlug: string,
  tagIds: string[],
  condition: unknown,
  previousCondition?: unknown,
): Promise<{ tagIds: string[]; missing: string[] }> {
  if (condition !== "used" && previousCondition !== "used") return { tagIds, missing: [] };
  const records = await Tag.find({}).select("_id slug name").lean<{ _id: { toString(): string }; slug: string; name: string }[]>();
  const tags = records.map((record) => ({ _id: String(record._id), slug: record.slug, name: record.name }));
  if (condition === "used" && isConsoleGeneration(categorySlug)) {
    return syncUsedConsoleTags(tagIds, tags, categorySlug);
  }
  if (previousCondition === "used" && condition !== "used") {
    return { tagIds: removeUsedConditionTag(tagIds, tags), missing: [] };
  }
  return { tagIds, missing: [] };
}

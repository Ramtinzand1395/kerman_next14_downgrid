"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, Loader2, PackagePlus, X } from "lucide-react";

import type { ProductForm, Tag } from "@/types";

import BasicInfoFields from "../modals/BasicInfoFields";
import CategorySelector from "../modals/CategorySelector";
import TagsSelector from "../modals/TagsSelector";
import GalleryUploader from "../modals/GalleryUploader";
import ImageUploader from "../modals/ImageUploader";
import SpecificationsEditor from "../modals/SpecificationsEditor";
import FaqEditor from "../modals/FaqEditor";
import SeoFields from "../modals/SeoFields";
import SeoAnalyzer from "../modals/SeoAnalyzer";
import dynamic from "next/dynamic";

const VariantSelectorBuilder = dynamic(
  () => import("../modals/VariantSelectorBuilder"),
  {
    ssr: false,
    loading: () => (
      <p className="text-xs text-slate-400">در حال بارگذاری انتخاب‌گر…</p>
    ),
  },
);

interface Props {
  onClose: () => void;
  onSave?: (p: any) => Promise<void> | void;
  product?: any;
}

const initialForm: ProductForm = {
  status: "draft",
  productType: "single",
  title: "",
  slug: "",
  sku: "",
  seoTitle: "",
  metaDescription: "",
  price: 0,
  discountPrice: null,
  stock: 0,
  brand: "",
  description: "",
  shortDesc: "",
  mainImageAlt: "",
  category: "",
  mainImage: "",
  galleryImages: [],
  tags: [],
  specifications: [],
  faqs: [],
  variants: [],
  variantSelector: {
    enabled: false,
    version: 1,
    groups: [],
    mappings: [],
  },
};

type SectionKey = "publish" | "basic" | "variantSelector" | "taxonomy" | "media" | "specs" | "faq" | "seo" | "seoCheck";

interface DrawerSectionProps {
  title: string;
  sectionKey: SectionKey;
  openSection: SectionKey;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}

const DrawerSection = ({
  title,
  sectionKey,
  openSection,
  onToggle,
  children,
}: DrawerSectionProps) => (
  <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      className="mb-3 flex w-full items-center justify-between text-right text-xs font-semibold text-slate-200"
    >
      <span>{title}</span>
      <ChevronDown
        className={`h-4 w-4 transition-transform ${
          openSection === sectionKey ? "rotate-180" : ""
        }`}
      />
    </button>
    {openSection === sectionKey ? children : null}
  </section>
);

export default function AddProductDrawer({ onClose, onSave, product }: Props) {
  const [form, setForm] = useState<ProductForm>({
    status: product?.status || initialForm.status,
    title: product?.title || initialForm.title,
    slug: product?.slug || initialForm.slug,
    sku: product?.sku || initialForm.sku || "",
    seoTitle: product?.seoTitle || initialForm.seoTitle,
    productType: product?.productType || initialForm.productType,
    variants: product?.variants || initialForm.variants,
    variantSelector: product?.variantSelector || initialForm.variantSelector,
    metaDescription: product?.metaDescription || initialForm.metaDescription,
    price: product?.price || initialForm.price,
    discountPrice: product?.discountPrice ?? initialForm.discountPrice,
    stock: product?.stock || initialForm.stock,
    brand: product?.brand || initialForm.brand,
    description: product?.description || initialForm.description,
    shortDesc: product?.shortDesc || initialForm.shortDesc,
    mainImageAlt: product?.mainImageAlt || initialForm.mainImageAlt,
    category: product?.category?._id || initialForm.category,
    mainImage: product?.mainImage || initialForm.mainImage,
    galleryImages:
      product?.images?.map((img: any) =>
        typeof img === "string" ? { url: img, alt: "" } : img,
      ) || initialForm.galleryImages,
    tags: product?.tags?.map((t: Tag) => t._id) || initialForm.tags,
    specifications: product?.specifications || initialForm.specifications,
    faqs: product?.faqs || initialForm.faqs,
  });

  const [openSection, setOpenSection] = useState<SectionKey>("basic");

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tagsList, setTagsList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/category")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => toast.error("خطا در دریافت دسته‌بندی‌ها"));
  }, []);

  useEffect(() => {
    fetch("/api/admin/tag")
      .then((res) => res.json())
      .then(setTagsList)
      .catch(() => toast.error("خطا در دریافت تگ‌ها"));
  }, []);

  const toggleSection = (key: SectionKey) => {
    setOpenSection((prev) => (prev === key ? prev : key));
  };

  const updateField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!form.title.trim()) {
      toast.error("عنوان محصول الزامی است");
      return false;
    }
    if (!form.slug.trim()) {
      toast.error("اسلاگ محصول الزامی است");
      return false;
    }
    if (!form.category) {
      toast.error("لطفاً دسته‌بندی محصول را انتخاب کنید");
      return false;
    }
    if (form.productType === "single") {
      if (typeof form.price !== "number" || form.price < 0) {
        toast.error("قیمت محصول نامعتبر است");
        return false;
      }
      if (
        form.discountPrice !== null &&
        form.discountPrice !== undefined &&
        form.discountPrice > form.price
      ) {
        toast.error("قیمت تخفیف نمی‌تواند بیشتر از قیمت اصلی باشد");
        return false;
      }
      if (typeof form.stock !== "number" || form.stock < 0) {
        toast.error("موجودی محصول نامعتبر است");
        return false;
      }
    } else {
      if (!Array.isArray(form.variants) || form.variants.length === 0) {
        toast.error("محصول چند مدلی باید حداقل دارای یک مدل باشد");
        return false;
      }
      for (let i = 0; i < form.variants.length; i++) {
        const v = form.variants[i];
        if (!v.title || !v.title.trim()) {
          toast.error(`نام مدل ردیف ${i + 1} الزامی است`);
          return false;
        }
        if (typeof v.price !== "number" || v.price < 0) {
          toast.error(`قیمت مدل «${v.title}» نامعتبر است`);
          return false;
        }
        if (
          v.discountPrice !== null &&
          v.discountPrice !== undefined &&
          v.discountPrice > v.price
        ) {
          toast.error(`قیمت تخفیف مدل «${v.title}» نمی‌تواند بیشتر از قیمت آن باشد`);
          return false;
        }
        if (typeof v.stock !== "number" || v.stock < 0) {
          toast.error(`موجودی مدل «${v.title}» نامعتبر است`);
          return false;
        }
      }
      if (
        form.status === "published" &&
        !form.variants.some((v) => v.isActive !== false)
      ) {
        toast.error("محصول چند مدلی برای انتشار باید حداقل یک مدل فعال داشته باشد");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variants:
            form.productType === "multi"
              ? form.variants.map((v) => ({
                  ...v,
                  title: v.title.trim(),
                  sku: v.sku?.trim() || undefined,
                  barcode: v.barcode?.trim() || undefined,
                }))
              : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "خطا در ذخیره محصول");
        return;
      }

      toast.success("محصول با موفقیت ذخیره شد");
      onSave?.(data);
      onClose();
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/product/${product?._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variants:
            form.productType === "multi"
              ? form.variants.map((v) => ({
                  ...v,
                  title: v.title.trim(),
                  sku: v.sku?.trim() || undefined,
                  barcode: v.barcode?.trim() || undefined,
                }))
              : [],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "خطا در بروزرسانی محصول");
        return;
      }

      toast.success("محصول با موفقیت بروزرسانی شد");
      onSave?.(data);
      onClose();
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className="h-full w-full max-w-5xl overflow-y-auto bg-slate-900 text-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            <h2 className="text-sm font-bold">
              {product ? "ویرایش محصول" : "افزودن محصول"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={product ? handleUpdate : handleSubmit}
          className="space-y-4 px-6 py-6"
        >
          <DrawerSection
            title="وضعیت انتشار"
            sectionKey="publish"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("status", "draft")}
                className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                  form.status === "draft"
                    ? "border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                پیش‌نویس
                <span className="mt-1 block text-[10px] font-normal opacity-70">
                  در سایت نمایش داده نمی‌شود
                </span>
              </button>
              <button
                type="button"
                onClick={() => updateField("status", "published")}
                className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${
                  form.status === "published"
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                آماده انتشار
                <span className="mt-1 block text-[10px] font-normal opacity-70">
                  در سایت نمایش داده می‌شود
                </span>
              </button>
            </div>
          </DrawerSection>

          <DrawerSection
            title="اطلاعات پایه"
            sectionKey="basic"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <BasicInfoFields form={form} updateField={updateField} />
          </DrawerSection>

          <DrawerSection
            title="مدیریت گزینه‌های انتخاب محصول"
            sectionKey="variantSelector"
            openSection={openSection}
            onToggle={toggleSection}
          >
            {form.productType === "multi" ? (
              <VariantSelectorBuilder
                value={form.variantSelector}
                variants={form.variants}
                onChange={(value) => updateField("variantSelector", value)}
              />
            ) : (
              <p className="text-xs text-slate-400">
                این بخش فقط برای محصول چند مدلی فعال است.
              </p>
            )}
          </DrawerSection>

          <DrawerSection
            title="دسته‌بندی و تگ‌ها"
            sectionKey="taxonomy"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <CategorySelector
                categories={categories}
                form={form}
                updateField={updateField}
              />
              <TagsSelector
                tagsList={tagsList}
                form={form}
                updateField={updateField}
              />
            </div>
          </DrawerSection>

          <DrawerSection
            title="تصاویر"
            sectionKey="media"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              <GalleryUploader form={form} updateField={updateField} />
              <ImageUploader form={form} updateField={updateField} />
            </div>
          </DrawerSection>

          <DrawerSection
            title="مشخصات فنی"
            sectionKey="specs"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <SpecificationsEditor form={form} updateField={updateField} />
          </DrawerSection>

          <DrawerSection
            title="سوالات پرتکرار"
            sectionKey="faq"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <FaqEditor form={form} updateField={updateField} />
          </DrawerSection>

          <DrawerSection
            title="تنظیمات سئو و محتوای محصول"
            sectionKey="seo"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <SeoFields form={form} updateField={updateField} />
            </div>
          </DrawerSection>

          <DrawerSection
            title="بررسی سئو قبل از انتشار"
            sectionKey="seoCheck"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <SeoAnalyzer form={form} />
          </DrawerSection>

          <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
            <div className="flex gap-3">
              <button
                type="submit"
                onClick={() => updateField("status", "draft")}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && form.status === "draft" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                ذخیره پیش‌نویس
              </button>
              <button
                type="submit"
                onClick={() => updateField("status", "published")}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && form.status === "published" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {loading && form.status === "published"
                  ? product
                    ? "در حال بروزرسانی..."
                    : "در حال انتشار..."
                  : product
                    ? "بروزرسانی و انتشار"
                    : "انتشار محصول"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Eye, FileText, ImagePlus, Layers3, Loader2, PackagePlus, Save, SearchCheck, ShieldCheck, X } from "lucide-react";

import type { Category, ProductForm, ProductVariant, Tag } from "@/types";
import { isPurchasePrice } from "@/lib/product-profit";

import UsedConsoleFields from "../modals/UsedConsoleFields";
import { isConsoleGeneration, readConsoleReport, syncUsedConsoleTags, removeUsedConditionTag, type ConsoleGeneration } from "@/lib/used-console";
import BasicInfoFields from "../modals/BasicInfoFields";
import CategorySelector from "../modals/CategorySelector";
import TagsSelector from "../modals/TagsSelector";
import GalleryUploader from "../modals/GalleryUploader";
import ImageUploader from "../modals/ImageUploader";
import SpecificationsEditor from "../modals/SpecificationsEditor";
import FaqEditor from "../modals/FaqEditor";
import SeoFields from "../modals/SeoFields";
import SeoAnalyzer from "../modals/SeoAnalyzer";
import ProductDraftPreview from "../modals/ProductDraftPreview";
import dynamic from "next/dynamic";

const VariantSelectorBuilder = dynamic(
  () => import("../modals/VariantSelectorBuilder"),
  {
    ssr: false,
    loading: () => (
      <p className="text-xs text-slate-500">در حال بارگذاری انتخاب‌گر…</p>
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
  barcode: "",
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

type StepKey = "basic" | "taxonomy" | "media" | "details" | "seo" | "preview" | "publish";
type SaveStatus = "draft" | "published";

const STEPS = [
  { key: "basic", title: "اطلاعات و قیمت", hint: "نام، نوع، قیمت و موجودی", icon: PackagePlus },
  { key: "taxonomy", title: "دسته و وضعیت", hint: "دسته‌بندی، برچسب و تست دستگاه", icon: Layers3 },
  { key: "media", title: "تصاویر محصول", hint: "عکس اصلی و گالری", icon: ImagePlus },
  { key: "details", title: "مشخصات بیشتر", hint: "مشخصات، تنوع‌ها و سوالات", icon: FileText },
  { key: "seo", title: "سئو و محتوا", hint: "اطلاعات گوگل و بررسی سئو", icon: SearchCheck },
  { key: "preview", title: "پیش‌نمایش صفحه", hint: "نمای مشتری پیش از انتشار", icon: Eye },
  { key: "publish", title: "بررسی نهایی", hint: "آماده‌سازی برای ذخیره و انتشار", icon: ShieldCheck },
] as const;

const USED_CONSOLE_CHOICES: { slug: ConsoleGeneration; label: string }[] = [
  { slug: "playstation-2", label: "PS2" },
  { slug: "playstation-3", label: "PS3" },
  { slug: "playstation-4", label: "PS4" },
  { slug: "playstation-5", label: "PS5" },
];

const stepForProductField = (field: string | undefined): StepKey => {
  const key = field?.split(".")[0] || "";
  if (["mainImage", "mainImageAlt", "galleryImages", "images"].includes(key)) return "media";
  if (["category", "tags", "usedConsole", "condition"].includes(key)) return "taxonomy";
  if (["specifications", "faqs", "variantSelector", "defaultVariantId"].includes(key)) return "details";
  if (["seoTitle", "metaDescription"].includes(key)) return "seo";
  return "basic";
};

const saveErrorMessage = (status: number, serverMessage?: string): string => {
  if (status === 401) return "نشست مدیریت منقضی شده است. دوباره وارد پنل شوید؛ اطلاعات واردشده در این فرم را پیش از بستن حفظ کنید.";
  if (status === 403) return "حساب فعلی مجوز ثبت محصول ندارد. با حساب مدیر اصلی وارد شوید.";
  if (status === 409) return serverMessage || "این شناسه یا بارکد تکراری است یا اطلاعات محصول هم‌زمان تغییر کرده است. مقدار را اصلاح یا فرم را دوباره باز کنید.";
  if (status === 413) return "حجم اطلاعات ارسالی بیش از محدودیت سرور است. تعداد یا حجم تصاویر را بررسی کنید.";
  if (status === 429) return "درخواست‌های ثبت محصول بیش از حد مجاز بوده است. کمی بعد دوباره تلاش کنید.";
  if (status >= 500) return serverMessage || "سرور در ذخیره محصول با خطا روبه‌رو شد. اطلاعات فرم حفظ شده‌اند؛ اتصال پایگاه داده یا لاگ سرور را بررسی کنید.";
  return serverMessage || "اطلاعات محصول پذیرفته نشد. فیلدهای الزامی و مقادیر واردشده را بررسی کنید.";
};

export default function AddProductDrawer({ onClose, onSave, product }: Props) {
  const [form, setForm] = useState<ProductForm>({
    condition: product?.condition ?? null,
    usedConsole: product?.usedConsole ?? null,
    status: product?.status || initialForm.status,
    title: product?.title || initialForm.title,
    slug: product?.slug || initialForm.slug,
    sku: product?.sku || initialForm.sku || "",
    barcode: product?.barcode ?? initialForm.barcode ?? "",
    seoTitle: product?.seoTitle || initialForm.seoTitle,
    productType: product?.productType || initialForm.productType,
    variants: product?.variants || initialForm.variants,
    variantSelector: product?.variantSelector || initialForm.variantSelector,
    metaDescription: product?.metaDescription || initialForm.metaDescription,
    price: product?.price || initialForm.price,
    isDigital: product?.isDigital ?? false,
    isOnlineGame: product?.isOnlineGame ?? false,
    purchasePrice: product?.purchasePrice ?? null,
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

  const [activeStep, setActiveStep] = useState<StepKey>("basic");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<SaveStatus | null>(null);
  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [tagsList, setTagsList] = useState<Tag[]>([]);

  useEffect(() => {
    fetch("/api/admin/category")
      .then(async (res) => {
        if (!res.ok) throw new Error("Category request failed");
        const result: unknown = await res.json();
        if (!Array.isArray(result)) throw new Error("Invalid categories");
        setCategories(result as Category[]);
      })
      .catch(() => toast.error("دسته‌بندی‌ها دریافت نشدند؛ دوباره تلاش کنید."))
      .finally(() => setCategoriesLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/admin/tag")
      .then(async (res) => {
        if (!res.ok) throw new Error("Tag request failed");
        const result: unknown = await res.json();
        if (!Array.isArray(result)) throw new Error("Invalid tags");
        setTagsList(result as Tag[]);
      })
      .catch(() => {
        setTagsList([]);
        toast.error("برچسب‌ها از سرور دریافت نشدند. اتصال پنل مدیریت را بررسی و صفحه را تازه‌سازی کنید.");
      });
  }, []);

  const generation = categories.find(category => category._id === form.category)?.slug;
  const automaticTags = form.condition === "used" && isConsoleGeneration(generation)
    ? syncUsedConsoleTags(form.tags, tagsList, generation) : null;

  // Tag and category requests can complete after the user opens the editor.
  useEffect(() => {
    setForm((previous) => {
      const slug = categories.find((category) => category._id === previous.category)?.slug;
      if (previous.condition !== "used" || !isConsoleGeneration(slug)) return previous;
      const { tagIds } = syncUsedConsoleTags(previous.tags, tagsList, slug);
      return tagIds.length === previous.tags.length && tagIds.every((id, i) => id === previous.tags[i])
        ? previous : { ...previous, tags: tagIds };
    });
  }, [categories, tagsList]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const requestClose = () => {
    // An in-flight save or upload must never be interrupted by backdrop dismissal.
    if (loading || mainImageUploading || galleryUploading) return;
    if (isDirty && !window.confirm("تغییرات ذخیره‌نشده دارید. آیا می‌خواهید بدون ذخیره فرم را ببندید؟")) return;
    onClose();
  };

  const validationWarning = (step: StepKey, message: string) => {
    setActiveStep(step);
    setErrorMessage(message);
    toast.warning(message);
    return false;
  };

  const updateField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => {
    setIsDirty(true);
    setErrorMessage(null);
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "condition" && value === "used") {
        next.productType = "single";
        next.isDigital = false;
        next.isOnlineGame = false;
        next.stock = Math.min(1, Math.max(0, Number(next.stock) || 0));
        if (!product && next.stock === 0) next.stock = 1;
      }
      const nextGeneration = categories.find((category) => category._id === next.category)?.slug;
      if (key === "category" && prev.category !== next.category && prev.condition === "used") {
        // Never reuse a report from a different console generation.
        next.usedConsole = null;
      }
      if (key === "category" && !isConsoleGeneration(nextGeneration)) next.condition = null;
      if (next.condition === "used" && isConsoleGeneration(nextGeneration)) {
        next.tags = syncUsedConsoleTags(next.tags, tagsList, nextGeneration).tagIds;
      } else if (prev.condition === "used" && next.condition !== "used") {
        next.tags = removeUsedConditionTag(next.tags, tagsList);
      }
      return next;
    });
  };

  const startUsedConsole = (slug: ConsoleGeneration) => {
    const category = categories.find((item) => item.slug === slug);
    if (!category) {
      validationWarning("taxonomy", "دسته‌بندی این نسل کنسول هنوز وجود ندارد یا بارگذاری نشده است. ابتدا دسته‌بندی مربوط به PS2 تا PS5 را بسازید و دوباره تلاش کنید.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      category: category._id,
      condition: "used",
      tags: syncUsedConsoleTags(prev.tags, tagsList, slug).tagIds,
      usedConsole: prev.condition === "used" && prev.category === category._id ? prev.usedConsole : null,
      productType: "single",
      isDigital: false,
      isOnlineGame: false,
      stock: prev.condition === "used" && prev.category === category._id ? prev.stock : 1,
      variants: [],
      defaultVariantId: null,
      variantSelector: { enabled: false, version: 1, groups: [], mappings: [] },
    }));
    setIsDirty(true);
    setErrorMessage(null);
    setActiveStep("taxonomy");
  };

  const existingVariants: ProductVariant[] = product?.variants ?? [];
  const existingVariantIds = new Set(existingVariants.map((variant) => variant._id));

  const validateForm = (requestedStatus: SaveStatus) => {
    if (mainImageUploading || galleryUploading) {
      return validationWarning("media", "آپلود تصاویر هنوز کامل نشده است. بعد از پایان آپلود، دوباره ذخیره یا انتشار را انتخاب کنید.");
    }
    const costRequired = !product || product.productType === "multi" || isPurchasePrice(product.purchasePrice);
    if (!form.title?.trim()) return validationWarning("basic", "نام محصول را وارد کنید.");
    if (!form.slug?.trim()) return validationWarning("basic", "آدرس (اسلاگ) محصول را وارد کنید.");
    if (!form.category) return validationWarning("taxonomy", "یک دسته‌بندی برای محصول انتخاب کنید.");

    if (form.productType === "single") {
      if ((costRequired || form.purchasePrice != null) && !isPurchasePrice(form.purchasePrice)) {
        return validationWarning("basic", "قیمت خرید معتبر را وارد کنید.");
      }
      if (typeof form.price !== "number" || !Number.isFinite(form.price) || form.price < 0) {
        return validationWarning("basic", "قیمت فروش محصول معتبر نیست.");
      }
      if (typeof form.stock !== "number" || !Number.isInteger(form.stock) || form.stock < 0) {
        return validationWarning("basic", "موجودی محصول باید عدد صحیح نامنفی باشد.");
      }
      if (form.discountPrice != null && form.discountPrice > form.price) {
        return validationWarning("basic", "قیمت تخفیف نمی‌تواند از قیمت فروش بیشتر باشد.");
      }
    } else {
      if (!form.variants.length) return validationWarning("basic", "برای محصول چندمدلی حداقل یک مدل اضافه کنید.");
      for (const [index, variant] of form.variants.entries()) {
        const previous = existingVariants.find(entry => entry._id === variant._id);
        if ((!previous || isPurchasePrice(previous.purchasePrice) || variant.purchasePrice != null)
          && !isPurchasePrice(variant.purchasePrice)) {
          return validationWarning("basic", "قیمت خرید مدل " + (index + 1).toLocaleString("fa-IR") + " را وارد کنید.");
        }
        if (!variant.title?.trim()) return validationWarning("basic", "نام مدل " + (index + 1).toLocaleString("fa-IR") + " را وارد کنید.");
        if (!Number.isFinite(variant.price) || variant.price < 0 || !Number.isInteger(variant.stock) || variant.stock < 0) {
          return validationWarning("basic", "قیمت و موجودی مدل «" + variant.title + "» نامعتبر است.");
        }
        if (variant.discountPrice != null && variant.discountPrice > variant.price) {
          return validationWarning("basic", "قیمت تخفیف مدل «" + variant.title + "» از قیمت اصلی بیشتر است.");
        }
      }
      if (requestedStatus === "published" && !form.variants.some(v => v.isActive !== false)) {
        return validationWarning("basic", "برای انتشار حداقل یک مدل فعال کنید.");
      }
    }

    if (form.condition === "used") {
      if (!isConsoleGeneration(generation)) {
        return validationWarning("taxonomy", "کنسول کارکرده باید در دسته‌بندی نسل PS2 تا PS5 باشد.");
      }
      if (form.productType !== "single" || form.isDigital || form.isOnlineGame || form.stock > 1) {
        return validationWarning("basic", "کنسول کارکرده باید فیزیکی، تک‌مدلی و دارای موجودی صفر یا یک باشد.");
      }
      try {
        readConsoleReport(form.usedConsole, generation, requestedStatus === "published");
      } catch (error) {
        return validationWarning("taxonomy", (error as Error).message);
      }
    }
    if (requestedStatus === "published" && !form.mainImage?.trim()) {
      return validationWarning("media", "تصویر اصلی محصول ثبت نشده است. وارد مرحله «تصاویر محصول» شوید، یک عکس آپلود کنید و بعد از نمایش تصویر، انتشار را تکرار کنید.");
    }
    setErrorMessage(null);
    return true;
  };

  const saveProduct = async (requestedStatus: SaveStatus) => {
    if (loading || !validateForm(requestedStatus)) return;
    setLoading(true);
    setSavingStatus(requestedStatus);
    try {
      const res = await fetch(product ? "/api/admin/product/" + product._id : "/api/admin/product", {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          status: requestedStatus,
          ...(product ? { expectedInventoryVersion: product.inventoryVersion ?? 0 } : {}),
          variants: form.productType === "multi"
            ? form.variants.map(({ _id, ...variant }) => ({
              ...variant,
              ...(existingVariantIds.has(_id) ? { _id } : { clientVariantId: _id }),
              title: variant.title.trim(),
              sku: variant.sku?.trim() || undefined,
              barcode: variant.barcode?.trim() || undefined,
            }))
            : [],
        }),
      });
      const payload: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const info = payload && typeof payload === "object" ? payload as { error?: unknown; field?: unknown } : {};
        const serverMessage = typeof info.error === "string" ? info.error : undefined;
        const message = saveErrorMessage(res.status, serverMessage);
        const field = typeof info.field === "string" ? info.field : undefined;
        if (field) setActiveStep(stepForProductField(field));
        else if (res.status === 409 && /SKU|بارکد|نامک|slug/i.test(message)) setActiveStep("basic");
        setErrorMessage(message);
        toast.error(message);
        return;
      }
      toast.success(requestedStatus === "draft" ? "پیش‌نویس محصول ذخیره شد." : "محصول با موفقیت منتشر شد.");
      try {
        if (onSave) await onSave(payload);
      } catch {
        toast.warning("محصول ذخیره شد، ولی تازه‌سازی لیست انجام نشد. صفحه محصولات را تازه‌سازی کنید.");
      }
      onClose();
    } catch {
      const message = "ارتباط با سرور ثبت محصول برقرار نشد. اینترنت، VPN و اتصال سرور را بررسی کنید. داده‌های واردشده در فرم پاک نشده‌اند؛ دوباره تلاش کنید.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setSavingStatus(null);
    }
  };

  const activeIndex = STEPS.findIndex(step => step.key === activeStep);
  const active = STEPS[activeIndex];
  const chosenCategory = categories.find(category => category._id === form.category);
  const priceReady = form.productType === "single"
    ? isPurchasePrice(form.purchasePrice) && Number.isFinite(form.price) && form.price >= 0
    : form.variants.length > 0 && form.variants.every(variant => variant.title.trim() && isPurchasePrice(variant.purchasePrice));
  let reportReady = true;
  if (form.condition === "used") {
    reportReady = false;
    if (isConsoleGeneration(generation)) {
      try {
        readConsoleReport(form.usedConsole, generation, true);
        reportReady = true;
      } catch {
        // Incomplete test reports are allowed while saving drafts.
      }
    }
  }
  const checklist: { label: string; completed: boolean; step: StepKey }[] = [
    { label: "عنوان و آدرس محصول", completed: !!form.title?.trim() && !!form.slug?.trim(), step: "basic" },
    { label: "قیمت و موجودی", completed: !!priceReady, step: "basic" },
    { label: "دسته‌بندی", completed: !!form.category, step: "taxonomy" },
    ...(form.condition === "used" ? [{ label: "گزارش تست همین دستگاه", completed: reportReady, step: "taxonomy" as StepKey }] : []),
    { label: "تصویر اصلی", completed: !!form.mainImage?.trim(), step: "media" },
  ];
  const completedCount = checklist.filter(item => item.completed).length;
  const completion = Math.round(completedCount * 100 / checklist.length);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[3px]" dir="rtl"
      onClick={(event) => { if (event.target === event.currentTarget) requestClose(); }}>

      <div role="dialog" aria-modal="true" aria-label={product ? "ویرایش محصول" : "ثبت محصول جدید"} className="dashboard-product-editor ml-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl min-w-0 flex-col overflow-hidden border-r border-slate-200 bg-[#f5f8fa] text-slate-900 shadow-2xl lg:rounded-l-2xl">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-3 sm:gap-3 sm:px-7 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><PackagePlus className="h-5 w-5" /></span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold sm:text-lg">{product ? "ویرایش محصول" : "ثبت محصول جدید"}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500">{form.title?.trim() || "اطلاعات را مرحله‌به‌مرحله تکمیل کنید"}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={"hidden rounded-full border px-3 py-1 text-xs font-semibold sm:inline-flex " + (product?.status === "published" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-500/30 bg-amber-50 text-amber-700")}>
              {product?.status === "published" ? "منتشرشده" : "پیش‌نویس"}
            </span>
            <button type="button" onClick={requestClose} disabled={loading || mainImageUploading || galleryUploading} aria-label="بستن فرم محصول" className="rounded-xl border border-slate-200 p-2.5 text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <nav aria-label="مراحل ساخت محصول" className="shrink-0 border-b border-slate-100 bg-slate-50 lg:w-64 lg:border-b-0 lg:border-l">
            <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain p-2.5 sm:p-3 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:p-4">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const selected = activeStep === step.key;
                return (
                  <button key={step.key} type="button" aria-current={selected ? "step" : undefined} onClick={() => setActiveStep(step.key)} className={"group flex min-w-[118px] shrink-0 snap-start items-center gap-2 rounded-xl border px-2.5 py-2.5 text-right transition sm:min-w-[138px] sm:gap-3 sm:px-3 sm:py-3 lg:w-full lg:min-w-0 " + (selected ? "border-teal-300 bg-teal-50 text-slate-900 shadow-sm" : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-800")}>
                    <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " + (selected ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500")}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-xs font-semibold sm:text-sm">{step.title}</span>
                      <span className="mt-1 hidden text-[11px] text-slate-500 lg:block">{step.hint}</span>
                    </span>
                    <span className="mr-auto hidden text-[10px] tabular-nums text-slate-500 lg:block">{(index + 1).toLocaleString("fa-IR")}</span>
                  </button>
                );
              })}
            </div>
            <div className="hidden border-t border-slate-100 p-5 lg:block">
              <div className="mb-2 flex items-center justify-between text-xs"><span className="text-slate-500">آمادگی انتشار</span><span className="font-bold text-teal-700">{completion.toLocaleString("fa-IR")}٪</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: completion + "%" }} /></div>
              <p className="mt-3 text-[11px] leading-6 text-slate-500">می‌توانید مراحل را به هر ترتیبی تکمیل کنید. تغییرات تا زمان ذخیره در سایت ثبت نمی‌شوند.</p>
            </div>
          </nav>

          <div ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-7 sm:py-7">
            <div className="mx-auto w-full min-w-0 max-w-3xl space-y-5 pb-5 sm:pb-8">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>مرحله {(activeIndex + 1).toLocaleString("fa-IR")} از {STEPS.length.toLocaleString("fa-IR")}</span>
                  <span>{completion.toLocaleString("fa-IR")}٪ اطلاعات کلیدی تکمیل شده</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: ((activeIndex + 1) * 100 / STEPS.length) + "%" }} /></div>
              </div>

              {errorMessage && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-800">
                <p className="font-bold">{product ? "ویرایش محصول انجام نشد" : "ثبت محصول انجام نشد"}</p>
                <p>{errorMessage}</p>
                <p className="mt-1 text-xs">اطلاعاتی که وارد کرده‌اید در فرم باقی می‌مانند؛ مشکل را رفع کنید و دوباره امتحان کنید.</p>
              </div>}

              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-6">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-bold">{active.title}</h3>
                  <p className="mt-1.5 text-xs leading-6 text-slate-500">{active.hint}</p>
                </div>
                <form onSubmit={event => event.preventDefault()} className="space-y-5">
                  {activeStep === "basic" && <div className="space-y-5">
                    {!product && <section aria-labelledby="used-console-shortcut-heading" className="rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 id="used-console-shortcut-heading" className="flex items-center gap-2 text-sm font-black text-teal-800">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" /> ثبت سریع کنسول کارکرده
                          </h4>
                          <p className="mt-2 text-xs leading-6 text-slate-700">
                            نسل دستگاه را انتخاب کنید؛ دسته‌بندی اصلی، وضعیت کارکرده، تگ کارکرده و تگ همان نسل خودکار انتخاب می‌شوند و فرم گزارش تست باز می‌شود.
                          </p>
                        </div>
                        <span className="rounded-full border border-teal-200 bg-slate-50 px-3 py-1 text-[11px] text-teal-800">انتخاب خودکار دسته و تگ‌ها</span>
                      </div>
                      <div role="group" aria-label="انتخاب سریع نسل کنسول کارکرده" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {USED_CONSOLE_CHOICES.map((choice) => {
                          const exists = categories.some((category) => category.slug === choice.slug);
                          const selected = form.condition === "used" && generation === choice.slug;
                          return <button key={choice.slug} type="button" aria-pressed={selected} disabled={loading || categoriesLoading || !exists} onClick={() => startUsedConsole(choice.slug)}
                            className={"min-h-14 rounded-xl border px-3 py-2.5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50 " + (selected ? "border-teal-600 bg-teal-100" : "border-slate-300 bg-white hover:border-teal-500 hover:bg-teal-50")}>
                            <span className="block text-base font-black text-slate-900">{choice.label}</span>
                            {!categoriesLoading && <span className={"mt-1 block text-[10px] " + (exists ? "text-teal-700" : "text-amber-700")}>{selected ? "انتخاب شده" : exists ? "آماده ثبت" : "دسته موجود نیست"}</span>}
                          </button>;
                        })}
                      </div>
                      {categoriesLoading && <p role="status" className="mt-3 text-xs text-slate-500">در حال دریافت دسته‌بندی‌های سایت…</p>}
                      {!categoriesLoading && USED_CONSOLE_CHOICES.some(choice => !categories.some(category => category.slug === choice.slug)) &&
                        <p className="mt-3 text-xs leading-6 text-amber-800">اگر دسته نسل موردنظر وجود ندارد، ابتدا آن را از بخش «دسته‌بندی‌ها» در منوی مدیریت ایجاد کنید.</p>}
                    </section>}
                    <BasicInfoFields form={form} updateField={updateField}
                      purchasePriceRequired={!product || product.productType === "multi" || isPurchasePrice(product.purchasePrice)}
                      variantPurchasePriceRequired={variant => !existingVariantIds.has(variant._id) ||
                        isPurchasePrice(existingVariants.find(entry => entry._id === variant._id)?.purchasePrice)}
                    />
                  </div>}

                  {activeStep === "taxonomy" && <div className="space-y-6">
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-6 text-sky-800">
                      {isConsoleGeneration(generation) && form.condition === "used"
                        ? "دسته نسل دستگاه انتخاب شده است. گزارش تست همین نسل را تکمیل کنید؛ تگ کارکرده و تگ نسل به‌صورت خودکار تنظیم می‌شوند."
                        : "برای ثبت کنسول کارکرده، نسل دستگاه را از بخش دسته‌بندی انتخاب و وضعیت آن را کارکرده کنید. گزارش تست براساس دسته اصلی نمایش داده می‌شود."}
                      {!product && <button type="button" className="mr-2 font-bold text-teal-700 underline underline-offset-4 hover:text-teal-800" onClick={() => setActiveStep("basic")}>انتخاب سریع نسل</button>}
                    </div>
                    <CategorySelector categories={categories} form={form} updateField={updateField} />
                    {isConsoleGeneration(generation) && <UsedConsoleFields generation={generation} form={form} updateField={updateField} />}
                    <div className="border-t border-slate-100 pt-5">
                      {automaticTags && <div role="status" className="mb-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs leading-6 text-teal-800">
                        {automaticTags.missing.length === 0 ? "تگ کارکرده و تگ نسل دستگاه خودکار انتخاب شده‌اند؛ می‌توانید تگ‌های دیگر را اضافه کنید." : tagsList.length ? "تگ‌های موردنیاز در فهرست موجود نیستند: " + automaticTags.missing.join("، ") + ". قبل از انتشار از بخش مدیریت تگ‌ها آن‌ها را بررسی کنید." : "تگ‌های خودکار هنگام دریافت فهرست یا ذخیره محصول بررسی می‌شوند."}
                      </div>}
                      <TagsSelector tagsList={tagsList} form={form} updateField={updateField} lockedTagIds={automaticTags?.lockedIds} />
                    </div>
                  </div>}

                  {activeStep === "media" && <div className="space-y-5">
                    <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-6 text-sky-800">تصویر اصلی روی کارت و صفحه محصول نمایش داده می‌شود. برای محصول کارکرده، حتماً عکس واقعی همان دستگاه را بگذارید. پیش‌نویس را می‌توانید بدون عکس ذخیره کنید.</p>
                    <GalleryUploader form={form} updateField={updateField} onUploadingChange={setMainImageUploading} />
                    <ImageUploader form={form} updateField={updateField} onUploadingChange={setGalleryUploading} />
                  </div>}

                  {activeStep === "details" && <div className="space-y-6">
                    {form.productType === "multi" && <div>
                      <h4 className="mb-3 text-sm font-bold text-slate-800">انتخاب مدل در صفحه محصول</h4>
                      <VariantSelectorBuilder value={form.variantSelector} variants={form.variants} onChange={value => updateField("variantSelector", value)} />
                    </div>}
                    <SpecificationsEditor form={form} updateField={updateField} />
                    <FaqEditor form={form} updateField={updateField} />
                  </div>}

                  {activeStep === "seo" && <div className="space-y-6">
                    <SeoFields form={form} updateField={updateField} />
                    <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-800">مشاهده تحلیل کامل سئو</summary>
                      <div className="mt-4"><SeoAnalyzer form={form} /></div>
                    </details>
                  </div>}

                  {activeStep === "preview" &&
                    <ProductDraftPreview form={form} categoryName={chosenCategory?.name}
                      tagNames={tagsList.filter((tag) => form.tags.includes(tag._id)).map((tag) => tag.name)} />
                  }

                  {activeStep === "publish" && <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <h4 className="mb-1 flex items-center gap-2 text-sm font-bold"><ClipboardCheck className="h-4 w-4 text-teal-700" /> چک‌لیست محصول</h4>
                      <p className="mb-4 text-xs leading-6 text-slate-500">روی هر مورد ناقص بزنید تا مستقیم به بخش مربوطه بروید.</p>
                      <div className="space-y-2">
                        {checklist.map(item => <button key={item.label} type="button" onClick={() => setActiveStep(item.step)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-right text-sm transition hover:bg-slate-100">
                          <span className="flex items-center gap-2">{item.completed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <span className="flex h-4 w-4 items-center justify-center rounded-full border border-amber-500 text-[10px] text-amber-400">!</span>}{item.label}</span>
                          <span className={item.completed ? "text-xs text-emerald-400" : "text-xs text-amber-700"}>{item.completed ? "تکمیل" : "نیاز به بررسی"}</span>
                        </button>)}
                      </div>
                    </div>
                    <button type="button" onClick={() => setActiveStep("preview")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm font-bold text-teal-800 hover:border-teal-400">
                      <Eye className="h-4 w-4" /> مشاهده پیش‌نمایش صفحه محصول قبل از انتشار
                    </button>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-1 text-xs text-slate-500">نام محصول</p>
                        <p className="break-words text-sm font-semibold">{form.title || "هنوز وارد نشده"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-1 text-xs text-slate-500">دسته‌بندی</p>
                        <p className="text-sm font-semibold">{chosenCategory?.name || "انتخاب نشده"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-1 text-xs text-slate-500">نوع کالا</p>
                        <p className="text-sm font-semibold">{form.condition === "used" ? "کنسول کارکرده" : form.productType === "multi" ? "چندمدلی" : "تک‌مدلی"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="mb-1 text-xs text-slate-500">وضعیت تصویر</p>
                        <p className="text-sm font-semibold">{form.mainImage ? "تصویر اصلی انتخاب شده" : "تصویر اصلی ندارد"}</p>
                      </div>
                    </div>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">«ذخیره پیش‌نویس» محصول را در سایت نمایش نمی‌دهد. «انتشار» تمام کنترل‌های الزامی را انجام می‌دهد و بعد از موفقیت محصول برای مشتریان قابل مشاهده می‌شود.</p>
                  </div>}
                </form>
              </section>
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-slate-100 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgba(15,23,42,0.08)] sm:px-7">
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:min-w-0 sm:items-center">
              <button type="button" disabled={activeIndex === 0 || loading || mainImageUploading || galleryUploading} onClick={() => setActiveStep(STEPS[activeIndex - 1].key)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight className="h-4 w-4" /> قبلی</button>
              <button type="button" disabled={activeIndex === STEPS.length - 1 || loading || mainImageUploading || galleryUploading} onClick={() => setActiveStep(STEPS[activeIndex + 1].key)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">بعدی <ArrowLeft className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:min-w-0 sm:items-center sm:justify-end">
              <button type="button" disabled={loading || mainImageUploading || galleryUploading} onClick={() => void saveProduct("draft")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-400/20 disabled:opacity-50 sm:flex-none">
                {savingStatus === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره پیش‌نویس
              </button>
              <button type="button" disabled={loading || mainImageUploading || galleryUploading} onClick={() => void saveProduct("published")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50 sm:flex-none">
                {savingStatus === "published" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {product?.status === "published" ? "ذخیره و انتشار" : "انتشار محصول"}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

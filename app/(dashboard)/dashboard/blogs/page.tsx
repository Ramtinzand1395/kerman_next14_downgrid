"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  BookOpen,
  Edit3,
  Eye,
  FilePlus2,
  ImageOff,
  Loader2,
  Save,
  Search,
  Send,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type { BlogPost } from "@/types";
import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { analyzeBlogSeo, normalizeBlogSlug } from "@/lib/blogSeo";
import RichTextEditor from "../components/RichTextEditor";
import SeoAuditPanel from "./SeoAuditPanel";

type BlogForm = {
  title: string;
  seoTitle: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverImageAlt: string;
  metaDescription: string;
  focusKeyword: string;
  category: string;
  tags: string;
};

const emptyForm: BlogForm = {
  title: "",
  seoTitle: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  coverImageAlt: "",
  metaDescription: "",
  focusKeyword: "",
  category: "",
  tags: "",
};

const getValidImage = (value?: string) => {
  const trimmed = String(value || "").trim();
  return !trimmed || trimmed === "null" || trimmed === "undefined" ? "" : trimmed;
};

const scoreBadge = (score: number) => {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 55) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
};

export default function BlogsAdminPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(null);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [activeView, setActiveView] = useState<"editor" | "library">("editor");
  const [searchQuery, setSearchQuery] = useState("");
  const [serverIssues, setServerIssues] = useState<string[]>([]);

  const analysis = useMemo(
    () =>
      analyzeBlogSeo({
        ...form,
        focusKeyword: form.focusKeyword,
      }),
    [form],
  );

  const filteredBlogs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("fa");
    if (!query) return blogs;
    return blogs.filter((blog) =>
      [blog.title, blog.slug, blog.category, ...(blog.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("fa").includes(query)),
    );
  }, [blogs, searchQuery]);

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/blog");
      if (!response.ok) throw new Error("خطا در دریافت مقاله‌ها");
      setBlogs((await response.json()) as BlogPost[]);
    } catch (error) {
      console.error(error);
      toast.error("دریافت فهرست مقاله‌ها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBlogs();
  }, [fetchBlogs]);

  const updateForm = <K extends keyof BlogForm>(key: K, value: BlogForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setServerIssues([]);
  };

  const handleTitleChange = (title: string) => {
    setForm((previous) => ({
      ...previous,
      title,
      slug: slugTouched ? previous.slug : normalizeBlogSlug(title),
    }));
    setServerIssues([]);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingBlog(null);
    setSlugTouched(false);
    setServerIssues([]);
  };

  const startNewArticle = () => {
    resetForm();
    setActiveView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setSlugTouched(true);
    setServerIssues([]);
    setForm({
      title: blog.title,
      seoTitle: blog.seoTitle || "",
      slug: blog.slug,
      excerpt: blog.excerpt || "",
      content: blog.content || "",
      coverImage: getValidImage(blog.coverImage),
      coverImageAlt: blog.coverImageAlt || "",
      metaDescription: blog.metaDescription || "",
      focusKeyword: blog.focusKeyword?.join(", ") || "",
      category: blog.category || "",
      tags: blog.tags?.join(", ") || "",
    });
    setActiveView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warning("فایل انتخاب‌شده تصویر نیست");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warning("حجم تصویر باید کمتر از ۵ مگابایت باشد");
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadCloudinaryImage(file);
      setForm((previous) => ({ ...previous, coverImage: url }));
      toast.success("تصویر شاخص آپلود شد");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "آپلود تصویر ناموفق بود");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (blog: BlogPost) => {
    if (!window.confirm(`مقاله «${blog.title}» برای همیشه حذف شود؟`)) return;

    try {
      const response = await fetch(`/api/admin/blog/${blog._id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "حذف مقاله ناموفق بود");
      if (editingBlog?._id === blog._id) resetForm();
      toast.success("مقاله حذف شد");
      await fetchBlogs();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "حذف مقاله ناموفق بود");
    }
  };

  const saveArticle = async (published: boolean) => {
    if (!form.title.trim()) {
      toast.warning("عنوان مقاله را وارد کنید");
      return;
    }

    if (published && !analysis.readyToPublish) {
      const issues = analysis.checks
        .filter((check) => check.status === "fail")
        .map((check) => check.message);
      setServerIssues(issues);
      document.getElementById("seo-audit")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      toast.warning("موارد قرمز چک‌لیست سئو را تکمیل کنید");
      return;
    }

    if (editingBlog?.published && !published) {
      const confirmed = window.confirm(
        "با ذخیره به‌عنوان پیش‌نویس، مقاله از سایت خارج می‌شود. ادامه می‌دهید؟",
      );
      if (!confirmed) return;
    }

    setSubmitting(published ? "publish" : "draft");
    setServerIssues([]);
    try {
      const response = await fetch(
        editingBlog ? `/api/admin/blog/${editingBlog._id}` : "/api/admin/blog",
        {
          method: editingBlog ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            published,
            focusKeyword: form.focusKeyword
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            tags: form.tags
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        },
      );
      const data = (await response.json()) as {
        error?: string;
        seoIssues?: string[];
      };
      if (!response.ok) {
        setServerIssues(data.seoIssues || []);
        throw new Error(data.error || "ذخیره مقاله ناموفق بود");
      }

      toast.success(
        published
          ? editingBlog
            ? "مقاله منتشرشده به‌روزرسانی شد"
            : "مقاله منتشر شد"
          : "پیش‌نویس ذخیره شد",
      );
      resetForm();
      await fetchBlogs();
      setActiveView("library");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "ذخیره مقاله ناموفق بود");
    } finally {
      setSubmitting(null);
    }
  };

  const previewImage = getValidImage(form.coverImage);

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <header className="overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-lg md:p-7">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold text-indigo-200">
              <BookOpen className="h-4 w-4" />
              مرکز محتوای کرمان آتاری
            </div>
            <h1 className="text-2xl font-black md:text-3xl">مدیریت حرفه‌ای مقاله‌ها</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              مقاله را بنویسید، کیفیت سئو را همان لحظه بسنجید و فقط پس از عبور از
              کنترل‌های ضروری منتشر کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewArticle}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-indigo-50"
          >
            <FilePlus2 className="h-4 w-4" />
            مقاله جدید
          </button>
        </div>

        <div className="mt-6 flex w-fit rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setActiveView("editor")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeView === "editor"
                ? "bg-white text-slate-900"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            ویرایشگر مقاله
          </button>
          <button
            type="button"
            onClick={() => setActiveView("library")}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeView === "library"
                ? "bg-white text-slate-900"
                : "text-slate-200 hover:bg-white/10"
            }`}
          >
            کتابخانه ({blogs.length.toLocaleString("fa-IR")})
          </button>
        </div>
      </header>

      {activeView === "editor" ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-indigo-600">
                    {editingBlog ? "در حال ویرایش" : "مقاله جدید"}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">
                    {editingBlog?.title || "اطلاعات اصلی مقاله"}
                  </h2>
                </div>
                {editingBlog ? (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                    لغو ویرایش
                  </button>
                ) : null}
              </div>

              {serverIssues.length ? (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-black text-rose-800">
                    پیش از انتشار این موارد را اصلاح کنید:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pr-5 text-xs leading-5 text-rose-700">
                    {serverIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700">
                    عنوان مقاله <b className="text-rose-500">*</b>
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    maxLength={180}
                    placeholder="مثلاً راهنمای خرید کنسول بازی برای خانواده‌ها"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                    <span>نشانی (Slug)</span>
                    <span className="font-normal text-slate-400">
                      {form.slug.length.toLocaleString("fa-IR")} / ۷۵
                    </span>
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-slate-50 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                    <span
                      dir="ltr"
                      className="hidden items-center border-l border-slate-200 px-3 text-xs text-slate-400 sm:flex"
                    >
                      /blog/
                    </span>
                    <input
                      dir="ltr"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        updateForm("slug", normalizeBlogSlug(event.target.value));
                      }}
                      maxLength={100}
                      placeholder="article-url"
                      className="w-full bg-white px-3.5 py-3 text-left text-sm outline-none"
                    />
                  </div>
                  <p className="text-[11px] leading-5 text-slate-400">
                    تا پیش از ویرایش دستی، نشانی به‌طور خودکار از عنوان ساخته می‌شود.
                  </p>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">دسته‌بندی</span>
                  <input
                    value={form.category}
                    onChange={(event) => updateForm("category", event.target.value)}
                    maxLength={60}
                    placeholder="راهنمای خرید"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700">برچسب‌ها</span>
                  <input
                    value={form.tags}
                    onChange={(event) => updateForm("tags", event.target.value)}
                    placeholder="پلی‌استیشن، خرید کنسول، بازی"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="text-[11px] text-slate-400">با ویرگول جدا کنید</p>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                    <span>خلاصه مقاله</span>
                    <span className="font-normal text-slate-400">
                      {analysis.stats.excerptLength.toLocaleString("fa-IR")} / ۲۲۰
                    </span>
                  </span>
                  <textarea
                    value={form.excerpt}
                    onChange={(event) => updateForm("excerpt", event.target.value)}
                    maxLength={320}
                    rows={3}
                    placeholder="ارزش مقاله و پاسخ اصلی آن را در دو جمله روشن توضیح دهید..."
                    className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-3 text-sm leading-7 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">تصویر شاخص</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    تصویر افقی با نسبت ۱۶:۹ و حداقل عرض ۱۲۰۰ پیکسل پیشنهاد می‌شود.
                  </p>
                </div>
                {previewImage ? (
                  <button
                    type="button"
                    onClick={() => {
                      updateForm("coverImage", "");
                      updateForm("coverImageAlt", "");
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    حذف
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                <label className="group relative flex min-h-40 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-indigo-400">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt={form.coverImageAlt || "پیش‌نمایش تصویر شاخص"}
                      fill
                      unoptimized
                      sizes="240px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="m-auto flex flex-col items-center gap-2 p-4 text-center text-xs text-slate-500">
                      {uploadingImage ? (
                        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
                      ) : (
                        <UploadCloud className="h-7 w-7 text-indigo-600" />
                      )}
                      {uploadingImage ? "در حال آپلود..." : "انتخاب تصویر شاخص"}
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="sr-only"
                    disabled={uploadingImage}
                    onChange={(event) => {
                      void handleCoverUpload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>

                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>متن جایگزین (Alt)</span>
                      <span className="font-normal text-slate-400">
                        {form.coverImageAlt.length.toLocaleString("fa-IR")} / ۱۲۵
                      </span>
                    </span>
                    <input
                      value={form.coverImageAlt}
                      onChange={(event) =>
                        updateForm("coverImageAlt", event.target.value)
                      }
                      maxLength={160}
                      placeholder="تصویر را برای کاربری که آن را نمی‌بیند توصیف کنید"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-bold text-slate-700">
                      یا نشانی مستقیم تصویر
                    </span>
                    <input
                      dir="ltr"
                      value={form.coverImage}
                      onChange={(event) => updateForm("coverImage", event.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-left text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">متن مقاله</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    مقدمه را با پاسخ مستقیم شروع کنید و بخش‌ها را با H2 و H3 بچینید.
                  </p>
                </div>
                <div className="flex gap-2 text-[11px] font-bold text-slate-500">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                    {analysis.stats.wordCount.toLocaleString("fa-IR")} کلمه
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                    {analysis.stats.readingTime.toLocaleString("fa-IR")} دقیقه
                  </span>
                </div>
              </div>
              <RichTextEditor
                label="محتوای کامل"
                value={form.content}
                onChange={(value) => updateForm("content", value)}
                imageUpload={uploadCloudinaryImage}
                placeholder="مقدمه مقاله را بنویسید؛ سپس موضوع را با تیترهای H2 بخش‌بندی کنید..."
                className="[&_.ql-container]:min-h-[420px] [&_.ql-editor]:min-h-[420px] [&_.ql-editor]:text-base [&_.ql-editor]:leading-8"
              />
            </section>

            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm md:p-6">
              <div className="mb-5">
                <p className="text-xs font-bold text-indigo-600">تنظیمات موتور جستجو</p>
                <h2 className="mt-1 text-base font-black text-slate-900">
                  عنوان، کلمه کلیدی و توضیحات متا
                </h2>
              </div>
              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>کلمه کلیدی اصلی و مرتبط</span>
                    <span className="font-normal text-slate-400">
                      اولین عبارت، کلمه اصلی است
                    </span>
                  </span>
                  <input
                    value={form.focusKeyword}
                    onChange={(event) =>
                      updateForm("focusKeyword", event.target.value)
                    }
                    placeholder="خرید پلی استیشن ۵، راهنمای خرید PS5"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>عنوان سئو</span>
                    <span
                      className={
                        analysis.stats.titleLength >= 30 &&
                        analysis.stats.titleLength <= 60
                          ? "font-normal text-emerald-600"
                          : "font-normal text-amber-600"
                      }
                    >
                      {analysis.stats.titleLength.toLocaleString("fa-IR")} / ۶۰
                    </span>
                  </span>
                  <input
                    value={form.seoTitle}
                    onChange={(event) => updateForm("seoTitle", event.target.value)}
                    maxLength={100}
                    placeholder="در صورت خالی بودن، عنوان مقاله استفاده می‌شود"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>توضیحات متا</span>
                    <span
                      className={
                        analysis.stats.metaLength >= 120 &&
                        analysis.stats.metaLength <= 165
                          ? "font-normal text-emerald-600"
                          : "font-normal text-amber-600"
                      }
                    >
                      {analysis.stats.metaLength.toLocaleString("fa-IR")} / ۱۶۵
                    </span>
                  </span>
                  <textarea
                    value={form.metaDescription}
                    onChange={(event) =>
                      updateForm("metaDescription", event.target.value)
                    }
                    maxLength={220}
                    rows={4}
                    placeholder="در ۱۲۰ تا ۱۶۵ کاراکتر، مزیت خواندن مقاله را همراه کلمه کلیدی توضیح دهید..."
                    className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-7 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {analysis.readyToPublish
                    ? "مقاله آماده انتشار است"
                    : "هنوز موارد ضروری باقی مانده است"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  پیش‌نویس بدون محدودیت ذخیره می‌شود؛ انتشار نیازمند رفع موارد قرمز است.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveArticle(false)}
                  disabled={Boolean(submitting) || uploadingImage}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {submitting === "draft" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  ذخیره پیش‌نویس
                </button>
                <button
                  type="button"
                  onClick={() => void saveArticle(true)}
                  disabled={Boolean(submitting) || uploadingImage}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none ${
                    analysis.readyToPublish
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-slate-400"
                  }`}
                >
                  {submitting === "publish" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {editingBlog?.published ? "به‌روزرسانی انتشار" : "انتشار مقاله"}
                </button>
              </div>
            </section>
          </main>

          <SeoAuditPanel
            analysis={analysis}
            title={form.title}
            seoTitle={form.seoTitle}
            slug={form.slug}
            metaDescription={form.metaDescription}
          />
        </div>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold text-indigo-600">آرشیو محتوا</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">
                کتابخانه مقاله‌ها
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                  {blogs
                    .filter((blog) => blog.published)
                    .length.toLocaleString("fa-IR")}{" "}
                  منتشرشده
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">
                  {blogs
                    .filter((blog) => !blog.published)
                    .length.toLocaleString("fa-IR")}{" "}
                  پیش‌نویس
                </span>
              </div>
            </div>
            <label className="relative block w-full md:max-w-sm">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="جستجو در عنوان، نشانی یا برچسب..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-3 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          {loading ? (
            <div className="grid min-h-64 place-items-center text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                در حال دریافت مقاله‌ها...
              </span>
            </div>
          ) : filteredBlogs.length === 0 ? (
            <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div>
                <ImageOff className="mx-auto h-9 w-9 text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-700">
                  {searchQuery ? "نتیجه‌ای پیدا نشد" : "هنوز مقاله‌ای ندارید"}
                </p>
                {!searchQuery ? (
                  <button
                    type="button"
                    onClick={startNewArticle}
                    className="mt-3 text-xs font-bold text-indigo-600"
                  >
                    اولین مقاله را بنویسید
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredBlogs.map((blog) => {
                const blogAnalysis = analyzeBlogSeo(blog);
                const image = getValidImage(blog.coverImage);
                return (
                  <article
                    key={blog._id}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative h-40 bg-slate-100">
                      {image ? (
                        <Image
                          src={image}
                          alt={blog.coverImageAlt || blog.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-300">
                          <ImageOff className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${
                            blog.published
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-400 text-amber-950"
                          }`}
                        >
                          {blog.published ? "منتشرشده" : "پیش‌نویس"}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${scoreBadge(
                            blogAnalysis.score,
                          )}`}
                        >
                          سئو {blogAnalysis.score.toLocaleString("fa-IR")}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] text-slate-400">
                        {blog.category ? <span>{blog.category}</span> : null}
                        {blog.category ? <span>•</span> : null}
                        <span>
                          {new Date(blog.updatedAt).toLocaleDateString("fa-IR")}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 min-h-12 text-base font-black leading-6 text-slate-900">
                        {blog.title}
                      </h3>
                      <p dir="ltr" className="mt-1 truncate text-left text-xs text-slate-400">
                        /blog/{blog.slug}
                      </p>
                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => startEdit(blog)}
                          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          ویرایش
                        </button>
                        {blog.published ? (
                          <a
                            href={`/blog/${blog.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            title="مشاهده مقاله"
                            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDelete(blog)}
                          title="حذف مقاله"
                          className="grid h-9 w-9 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

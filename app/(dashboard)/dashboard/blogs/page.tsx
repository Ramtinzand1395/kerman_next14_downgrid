"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  FileText,
  FilePlus2,
  ImageOff,
  LayoutGrid,
  Loader2,
  PenLine,
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "published" | "draft"
  >("all");
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
    return blogs.filter((blog) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && blog.published) ||
        (statusFilter === "draft" && !blog.published);
      const matchesQuery =
        !query ||
        [blog.title, blog.slug, blog.category, ...(blog.tags || [])]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("fa").includes(query),
          );
      return matchesStatus && matchesQuery;
    });
  }, [blogs, searchQuery, statusFilter]);

  const publishedCount = useMemo(
    () => blogs.filter((blog) => blog.published).length,
    [blogs],
  );
  const draftCount = blogs.length - publishedCount;
  const blogAnalyses = useMemo(
    () =>
      new Map(
        blogs.map((blog) => [blog._id, analyzeBlogSeo(blog)] as const),
      ),
    [blogs],
  );
  const averageSeoScore = useMemo(() => {
    if (!blogAnalyses.size) return 0;
    const total = Array.from(blogAnalyses.values()).reduce(
      (sum, blogAnalysis) => sum + blogAnalysis.score,
      0,
    );
    return Math.round(total / blogAnalyses.size);
  }, [blogAnalyses]);

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
    <div className="mx-auto max-w-[1500px] space-y-5 pb-10" dir="rtl">
      <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f5f7ff_52%,#eef2ff_100%)] p-5 shadow-[0_18px_50px_rgba(30,41,59,0.08)] md:p-7">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 shadow-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              مرکز محتوای کرمان آتاری
            </div>
            <h1 className="text-2xl font-black leading-tight text-slate-950 md:text-[34px]">
              مدیریت وبلاگ
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              مقاله‌ها را بنویسید، وضعیت انتشار را کنترل کنید و کیفیت سئو را
              پیش از انتشار بسنجید.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewArticle}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-black text-white shadow-[0_10px_22px_rgba(79,70,229,0.24)] transition hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 sm:w-fit"
          >
            <FilePlus2 className="h-5 w-5" aria-hidden="true" />
            ساخت مقاله جدید
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "همه مقاله‌ها",
              value: blogs.length,
              icon: FileText,
              color: "bg-indigo-50 text-indigo-600",
            },
            {
              label: "منتشرشده",
              value: publishedCount,
              icon: CheckCircle2,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "پیش‌نویس",
              value: draftCount,
              icon: Clock3,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "میانگین سئو",
              value: averageSeoScore,
              icon: BarChart3,
              color: "bg-sky-50 text-sky-600",
              suffix: "از ۱۰۰",
            },
          ].map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex min-h-[88px] items-center gap-3 rounded-2xl border border-white bg-white/90 p-3.5 shadow-[0_8px_22px_rgba(30,41,59,0.06)]"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                >
                  <StatIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-500 sm:text-xs">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-900">
                    {stat.value.toLocaleString("fa-IR")}
                    {stat.suffix ? (
                      <span className="mr-1 text-[10px] font-bold text-slate-400">
                        {stat.suffix}
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <nav
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(30,41,59,0.06)]"
        aria-label="بخش‌های مدیریت وبلاگ"
      >
        <button
          type="button"
          onClick={() => setActiveView("editor")}
          aria-pressed={activeView === "editor"}
          className={`flex min-h-[58px] items-center justify-center gap-3 rounded-xl px-3 text-right transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            activeView === "editor"
              ? "bg-slate-950 text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <PenLine className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block text-sm font-black">ویرایشگر مقاله</span>
            <span className="hidden text-[11px] opacity-70 sm:block">
              نوشتن، سئو و انتشار
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveView("library")}
          aria-pressed={activeView === "library"}
          className={`flex min-h-[58px] items-center justify-center gap-3 rounded-xl px-3 text-right transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            activeView === "library"
              ? "bg-slate-950 text-white shadow-md"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          <LayoutGrid className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            <span className="block text-sm font-black">
              کتابخانه ({blogs.length.toLocaleString("fa-IR")})
            </span>
            <span className="hidden text-[11px] opacity-70 sm:block">
              مدیریت مقاله‌های موجود
            </span>
          </span>
        </button>
      </nav>

      {activeView === "editor" ? (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-5">
            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(30,41,59,0.06)] md:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">
                    ۱
                  </span>
                  <div>
                    <p className="text-xs font-bold text-indigo-600">
                      {editingBlog ? "در حال ویرایش" : "مقاله جدید"}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-900">
                      {editingBlog?.title || "اطلاعات اصلی مقاله"}
                    </h2>
                  </div>
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

            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(30,41,59,0.06)] md:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-sm font-black text-violet-600">
                    ۲
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-900">تصویر شاخص</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      تصویر افقی با نسبت ۱۶:۹ و حداقل عرض ۱۲۰۰ پیکسل پیشنهاد می‌شود.
                    </p>
                  </div>
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

            <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(30,41,59,0.06)] md:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm font-black text-sky-600">
                    ۳
                  </span>
                  <div>
                    <h2 className="text-base font-black text-slate-900">متن مقاله</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      مقدمه را با پاسخ مستقیم شروع کنید و بخش‌ها را با H2 و H3 بچینید.
                    </p>
                  </div>
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

            <section className="rounded-[24px] border border-indigo-100 bg-[linear-gradient(145deg,#ffffff_0%,#f5f3ff_100%)] p-4 shadow-[0_10px_30px_rgba(79,70,229,0.07)] md:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">
                  ۴
                </span>
                <div>
                  <p className="text-xs font-bold text-indigo-600">تنظیمات موتور جستجو</p>
                  <h2 className="mt-1 text-base font-black text-slate-900">
                    عنوان، کلمه کلیدی و توضیحات متا
                  </h2>
                </div>
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

            <section className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
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
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_36px_rgba(30,41,59,0.07)] md:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                آرشیو محتوا
              </span>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                کتابخانه مقاله‌ها
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                جستجو، ویرایش و کنترل وضعیت انتشار همه محتواها در یک نگاه
              </p>
            </div>
            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="جستجو در عنوان، نشانی یا برچسب..."
                className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div
            className="mt-5 flex max-w-full gap-2 overflow-x-auto border-b border-slate-100 pb-4"
            aria-label="فیلتر وضعیت مقاله‌ها"
          >
            {[
              { id: "all" as const, label: "همه", count: blogs.length },
              {
                id: "published" as const,
                label: "منتشرشده",
                count: publishedCount,
              },
              { id: "draft" as const, label: "پیش‌نویس", count: draftCount },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                aria-pressed={statusFilter === filter.id}
                className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                  statusFilter === filter.id
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {filter.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    statusFilter === filter.id
                      ? "bg-white/15 text-white"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {filter.count.toLocaleString("fa-IR")}
                </span>
              </button>
            ))}
            <span className="mr-auto self-center whitespace-nowrap text-xs font-bold text-slate-400">
              {filteredBlogs.length.toLocaleString("fa-IR")} نتیجه
            </span>
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
                  {searchQuery || statusFilter !== "all"
                    ? "نتیجه‌ای پیدا نشد"
                    : "هنوز مقاله‌ای ندارید"}
                </p>
                {!searchQuery && statusFilter === "all" ? (
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
            <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {filteredBlogs.map((blog) => {
                const blogAnalysis =
                  blogAnalyses.get(blog._id) || analyzeBlogSeo(blog);
                const image = getValidImage(blog.coverImage);
                return (
                  <article
                    key={blog._id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(30,41,59,0.05)] transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_16px_34px_rgba(30,41,59,0.11)]"
                  >
                    <div className="relative aspect-[16/8.5] overflow-hidden bg-slate-100">
                      {image ? (
                        <Image
                          src={image}
                          alt={blog.coverImageAlt || blog.title}
                          fill
                          unoptimized
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-[1.03]"
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

                    <div className="flex flex-1 flex-col p-4">
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
                      {blog.excerpt ? (
                        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">
                          {blog.excerpt}
                        </p>
                      ) : null}
                      <p dir="ltr" className="mt-1 truncate text-left text-xs text-slate-400">
                        /blog/{blog.slug}
                      </p>
                      {blog.tags?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {blog.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() => startEdit(blog)}
                          className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-black text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void handleDelete(blog)}
                          title="حذف مقاله"
                          className="grid h-10 w-10 place-items-center rounded-xl border border-rose-200 text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
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

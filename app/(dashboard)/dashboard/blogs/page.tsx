"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Edit2,
  ImageOff,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { BlogPost } from "@/types";
import RichTextEditor from "../components/RichTextEditor";

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: true,
  metaDescription: "",
  focusKeyword: "",
};

const getValidImage = (value?: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  return trimmed;
};

const getEditorPlainText = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function BlogsAdminPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(initialForm);
  const [uploadingImage, setUploadingImage] = useState(false);

  const hasCloudinaryConfig = useMemo(
    () =>
      Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD) &&
      Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_PRESET),
    [],
  );

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/blog");
      if (!res.ok) throw new Error("خطا در دریافت وبلاگ‌ها");
      const data = await res.json();
      setBlogs(data);
    } catch (error) {
      console.error(error);
      toast.error("خطا در دریافت وبلاگ‌ها");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleImageUpload = async (file?: File) => {
    if (!file) return;

    if (!hasCloudinaryConfig) {
      toast.error("تنظیمات آپلود (Cloudinary) موجود نیست");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_PRESET as string,
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
        { method: "POST", body: formData },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "خطا در آپلود تصویر");
      }

      setForm((p) => ({ ...p, coverImage: data.secure_url }));
      toast.success("تصویر آپلود شد");
    } catch (error) {
      console.error(error);
      toast.error("خطا در آپلود تصویر");
    } finally {
      setUploadingImage(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingBlog(null);
  };

  const startEdit = (blog: BlogPost) => {
    setEditingBlog(blog);
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || "",
      content: blog.content,
      coverImage: getValidImage(blog.coverImage),
      published: blog.published,
      metaDescription: blog.metaDescription || "",
      focusKeyword: blog.focusKeyword?.join(", ") || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف شود؟")) return;

    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در حذف وبلاگ");
      toast.success("وبلاگ حذف شد");
      fetchBlogs();
    } catch (error) {
      console.error(error);
      toast.error("خطا در حذف وبلاگ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !getEditorPlainText(form.content)) {
      toast.warning("عنوان و محتوای وبلاگ الزامی است");
      return;
    }

    setSubmitting(true);
    try {
      const method = editingBlog ? "PUT" : "POST";
      const url = editingBlog
        ? `/api/admin/blog/${editingBlog._id}`
        : "/api/admin/blog";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          coverImage: getValidImage(form.coverImage),
          focusKeyword: form.focusKeyword
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "خطا در ذخیره وبلاگ");
      }

      toast.success(editingBlog ? "وبلاگ ویرایش شد" : "وبلاگ ایجاد شد");
      resetForm();
      fetchBlogs();
    } catch (error) {
      console.error(error);
      toast.error("خطا در ذخیره وبلاگ");
    } finally {
      setSubmitting(false);
    }
  };

  const previewImage = getValidImage(form.coverImage);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-base font-semibold">مدیریت وبلاگ‌ها</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            placeholder="عنوان"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />

          <input
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            placeholder="اسلاگ"
            value={form.slug}
            onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <Upload className="h-4 w-4" />
                {uploadingImage ? "در حال آپلود..." : "آپلود تصویر کاور"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleImageUpload(file);
                    e.target.value = "";
                  }}
                  disabled={!hasCloudinaryConfig || uploadingImage}
                />
              </label>

              {form.coverImage && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, coverImage: "" }))}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <X className="h-4 w-4" />
                  حذف تصویر
                </button>
              )}
            </div>

            <div className="relative h-32 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="پیش‌نمایش تصویر"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center gap-1 text-xs text-gray-500">
                  <ImageOff className="h-4 w-4" />
                  بدون تصویر
                </div>
              )}
            </div>
          </div>

          <textarea
            className="min-h-20 rounded-lg border border-gray-300 p-2.5 text-sm"
            placeholder="خلاصه"
            value={form.excerpt}
            onChange={(e) =>
              setForm((p) => ({ ...p, excerpt: e.target.value }))
            }
          />

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <RichTextEditor
              label="متن کامل وبلاگ"
              value={form.content}
              onChange={(value) => setForm((p) => ({ ...p, content: value }))}
              placeholder="متن کامل وبلاگ را وارد کنید..."
            />
          </section>

          <section className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <h3 className="text-sm font-semibold text-emerald-800">
              تنظیمات سئو مقاله
            </h3>

            <textarea
              className="min-h-20 rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="توضیحات متا (Meta Description)"
              value={form.metaDescription}
              onChange={(e) =>
                setForm((p) => ({ ...p, metaDescription: e.target.value }))
              }
            />

            <input
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="کلمات کلیدی اصلی (با ویرگول جدا کنید)"
              value={form.focusKeyword}
              onChange={(e) =>
                setForm((p) => ({ ...p, focusKeyword: e.target.value }))
              }
            />
          </section>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) =>
                setForm((p) => ({ ...p, published: e.target.checked }))
              }
            />
            انتشار
          </label>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={submitting || uploadingImage}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingBlog ? (
                <Edit2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingBlog ? "ویرایش" : "ایجاد"}
            </button>

            {editingBlog && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              >
                انصراف
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold">لیست وبلاگ‌ها</h3>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال دریافت...
          </div>
        ) : blogs.length === 0 ? (
          <p className="text-sm text-gray-500">وبلاگی وجود ندارد.</p>
        ) : (
          <div className="space-y-2">
            {blogs.map((b) => (
              <div
                key={b._id}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{b.title}</div>
                  <div className="text-xs text-gray-500">{b.slug}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(b)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <Edit2 className="h-4 w-4" />
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b._id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

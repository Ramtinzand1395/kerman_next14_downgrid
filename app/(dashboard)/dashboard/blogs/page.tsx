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

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: true,
};

const getValidImage = (value?: string) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  return trimmed;
};

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

  const uploadToCloudinary = async (file: File) => {
    if (!hasCloudinaryConfig) {
      throw new Error("تنظیمات Cloudinary کامل نیست");
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
      { method: "POST", body: fd },
    );

    const data = await res.json();
    if (!res.ok || !data.secure_url) {
      throw new Error("آپلود تصویر انجام نشد");
    }

    return data.secure_url as string;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const imageUrl = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, coverImage: imageUrl }));
      toast.success("تصویر شاخص با موفقیت آپلود شد");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "خطا در آپلود تصویر",
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.content.trim()) {
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
      toast.error(error instanceof Error ? error.message : "عملیات ناموفق بود");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این وبلاگ مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "خطا در حذف وبلاگ");
      }

      toast.success("وبلاگ حذف شد");
      setBlogs((prev) => prev.filter((blog) => blog._id !== id));

      if (editingBlog?._id === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "حذف وبلاگ انجام نشد",
      );
    }
  };

  const previewImage = getValidImage(form.coverImage);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">مدیریت وبلاگ‌ها</h1>

          {editingBlog && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700"
            >
              <X className="h-4 w-4" />
              لغو ویرایش
            </button>
          )}
        </div>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="عنوان"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
            />
            <input
              className="rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="اسلاگ (اختیاری)"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
            />
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_220px]">
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                placeholder="تصویر شاخص (URL)"
                value={form.coverImage}
                onChange={(e) =>
                  setForm((p) => ({ ...p, coverImage: e.target.value }))
                }
              />

              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm text-indigo-700 hover:bg-indigo-50">
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                آپلود تصویر در Cloudinary
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
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

          <textarea
            className="min-h-40 rounded-lg border border-gray-300 p-2.5 text-sm"
            placeholder="متن کامل وبلاگ"
            value={form.content}
            onChange={(e) =>
              setForm((p) => ({ ...p, content: e.target.value }))
            }
          />

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
              {editingBlog ? "ویرایش وبلاگ" : "افزودن وبلاگ"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800">
          لیست وبلاگ‌ها
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500">در حال دریافت...</div>
        ) : blogs.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">وبلاگی ثبت نشده است.</div>
        ) : (
          <div className="grid gap-3 p-3 sm:p-4">
            {blogs.map((blog) => {
              const image = getValidImage(blog.coverImage);

              return (
                <div
                  key={blog._id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {image ? (
                        <img
                          src={image}
                          alt={blog.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
                          بدون عکس
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {blog.title}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {blog.slug ? `/${blog.slug}` : "بدون اسلاگ"} •{" "}
                        {blog.published ? "منتشر شده" : "پیش‌نویس"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => startEdit(blog)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4" />
                      ویرایش
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(blog._id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

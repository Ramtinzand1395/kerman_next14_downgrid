"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { BlogPost } from "@/types";

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  published: true,
};

export default function BlogsAdminPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(initialForm);

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
      coverImage: blog.coverImage || "",
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

    try {
      setSubmitting(true);
      const endpoint = editingBlog
        ? `/api/admin/blog/${editingBlog._id}`
        : "/api/admin/blog";

      const res = await fetch(endpoint, {
        method: editingBlog ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "خطا در ذخیره وبلاگ");
      }

      toast.success(
        editingBlog
          ? "وبلاگ با موفقیت ویرایش شد"
          : "وبلاگ با موفقیت ایجاد شد"
      );
      resetForm();
      fetchBlogs();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("خطا در ذخیره وبلاگ");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این وبلاگ مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا در حذف وبلاگ");
      }

      toast.success("وبلاگ حذف شد");
      setBlogs((prev) => prev.filter((item) => item._id !== id));
      if (editingBlog?._id === id) resetForm();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("خطا در حذف وبلاگ");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              مدیریت وبلاگ (ساخت / ویرایش / حذف)
            </h1>
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
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <input
                className="rounded-lg border border-gray-300 p-2.5 text-sm"
                placeholder="اسلاگ (اختیاری)"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>

            <input
              className="rounded-lg border border-gray-300 p-2.5 text-sm"
              placeholder="تصویر شاخص (URL)"
              value={form.coverImage}
              onChange={(e) =>
                setForm((p) => ({ ...p, coverImage: e.target.value }))
              }
            />

            <textarea
              className="rounded-lg border border-gray-300 p-2.5 text-sm min-h-20"
              placeholder="خلاصه"
              value={form.excerpt}
              onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
            />

            <textarea
              className="rounded-lg border border-gray-300 p-2.5 text-sm min-h-40"
              placeholder="متن کامل وبلاگ"
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
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

            <button
              disabled={submitting}
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {editingBlog ? "ذخیره تغییرات" : "ایجاد وبلاگ"}
            </button>
          </form>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="p-3">عنوان</th>
                <th className="p-3">اسلاگ</th>
                <th className="p-3">وضعیت</th>
                <th className="p-3">تاریخ</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    در حال بارگذاری...
                  </td>
                </tr>
              ) : blogs.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={5}>
                    هنوز وبلاگی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                blogs.map((blog) => (
                  <tr key={blog._id} className="border-t border-gray-100">
                    <td className="p-3 font-medium text-gray-900">{blog.title}</td>
                    <td className="p-3 text-gray-600">{blog.slug}</td>
                    <td className="p-3 text-gray-600">
                      {blog.published ? "منتشر شده" : "پیش‌نویس"}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(blog.updatedAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(blog)}
                          className="rounded-md p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700"
                          title="ویرایش"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog._id)}
                          className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-700"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

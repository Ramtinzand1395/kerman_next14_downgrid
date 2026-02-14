"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FolderTree, Loader2, Plus, Trash2, X } from "lucide-react";
import { Category } from "@/types";

interface AddCategoryDrawerProps {
  onClose: () => void;
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

export default function AddCategoryDrawer({ onClose }: AddCategoryDrawerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/category");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data: Category[] = await res.json();

      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت دسته‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fetchCategories, onClose]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setParentId("");
  };

  const handleAdd = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.warning("نام و اسلاگ الزامی است");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/admin/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slugify(slug),
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("دسته با موفقیت اضافه شد");
        resetForm();
        fetchCategories();
      } else {
        toast.error(data.error || "خطا در افزودن دسته");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در افزودن دسته");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این دسته مطمئن هستید؟")) return;

    try {
      const res = await fetch(`/api/admin/category/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("دسته حذف شد");
        fetchCategories();
      } else {
        const data = await res.json();
        toast.error(data.error || "خطا در حذف دسته");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در حذف دسته");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end"
    >
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative h-full w-full max-w-md border-r border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-emerald-400" />
            <h2 className="text-sm font-bold">مدیریت دسته‌بندی‌ها</h2>
          </div>
          <button
            aria-label="بستن پنجره"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
            <p className="mb-3 text-xs text-slate-300">افزودن دسته جدید</p>
            <div className="space-y-2">
              <select
                title="انتخاب دسته مادر"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs outline-none ring-emerald-500 transition focus:ring-2"
              >
                <option value="">بدون دسته مادر</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="نام دسته"
                value={name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setName(nextName);
                  if (!slug) setSlug(slugify(nextName));
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs outline-none ring-emerald-500 transition placeholder:text-slate-500 focus:ring-2"
              />

              <input
                type="text"
                placeholder="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs outline-none ring-emerald-500 transition placeholder:text-slate-500 focus:ring-2"
              />

              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {saving ? "در حال ذخیره..." : "افزودن دسته"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-slate-300">لیست دسته‌ها</p>
              <span className="rounded-full bg-slate-700 px-2 py-1 text-[10px]">
                {categories.length} مورد
              </span>
            </div>

            <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بارگذاری...
                </div>
              ) : categories.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 py-6 text-center text-xs text-slate-500">
                  هنوز هیچ دسته‌ای ثبت نشده است.
                </p>
              ) : (
                categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold">{cat.name}</span>
                      <span className="text-[10px] text-slate-400">
                        مادر: {cat.parent ? cat.parent.name : "-"}
                      </span>
                    </div>
                    <button
                      title="delete"
                      onClick={() => handleDelete(cat._id)}
                      className="rounded-md bg-rose-600/90 p-1.5 transition hover:bg-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

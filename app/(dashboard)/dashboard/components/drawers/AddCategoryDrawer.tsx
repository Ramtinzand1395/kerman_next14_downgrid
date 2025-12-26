"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { X, Loader2 } from "lucide-react";
import { Category } from "@/types";

interface AddCategoryDrawerProps {
  onClose: () => void;
}

export default function AddCategoryDrawer({ onClose }: AddCategoryDrawerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleAdd = async () => {
    if (!name || !slug) return toast.warning("نام و اسلاگ الزامی است");
    try {
      const res = await fetch("/api/admin/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, parentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("دسته با موفقیت اضافه شد");
        setName("");
        setSlug("");
        setParentId(null);
        fetchCategories();
      } else {
        toast.error(`${data.error} نام اسلاگ تکراری است.`);
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در افزودن دسته");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این دسته مطمئن هستید؟")) return;
    console.log(id);
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="بستن"
      />

      <div className="relative bg-indigo-600 text-white w-3/4 md:w-[340px] h-full p-5 shadow-2xl rounded-r-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">مدیریت دسته‌بندی‌ها</h2>
          <button
            aria-label="بستن پنجره"
            onClick={onClose}
            className="text-gray-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* انتخاب مادر دسته */}
        <select
          title="دسته بندی"
          value={parentId ?? ""}
          onChange={(e) => setParentId(e.target.value ? e.target.value : null)}
          className="w-full bg-white text-black mb-2 border border-gray-400 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
        >
          <option value="">بدون مادر دسته</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Inputs */}
        <div className="mb-4 space-y-2">
          <input
            type="text"
            placeholder="نام دسته"
            aria-label="نام دسته"
            className="w-full bg-white text-black border border-gray-400 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="اسلاگ (مثلاً: playstation)"
            aria-label="اسلاگ"
            className="w-full bg-white text-black border border-gray-400 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-xs transition"
          >
            افزودن دسته جدید
          </button>
        </div>

        {/* List */}
        <div className=" bg-white/20 backdrop-blur-md border border-white/30 shadow-lg p-2 rounded-2xl  transition-all duration-300 h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال بارگذاری...
            </div>
          ) : categories.length === 0 ? (
            <p className="text-gray-400 text-xs text-center">
              هنوز هیچ دسته‌ای وجود ندارد.
            </p>
          ) : (
            <ul className="space-y-1 max-h-[50vh] grid grid-cols-2 gap-5">
              {categories.map((cat) => (
                <li
                  key={cat._id}
                  className={`flex justify-between items-center  hover:bg-gray-700 p-2 rounded-md text-xs border-2`}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-black text-xs">
                      {/* مادر: {cat?.parent?.name !== null ? cat.parent.name : "-"} */}
                      مادر: {cat.parent ? cat.parent.name : "-"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] transition cursor-pointer"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

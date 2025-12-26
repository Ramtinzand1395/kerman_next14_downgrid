"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { X, Loader2 } from "lucide-react";
import { Tag } from "@/types"; // فرض بر اینه که تایپ Tag داری

interface AddTagDrawerProps {
  onClose: () => void;
}

export default function AddTagDrawer({ onClose }: AddTagDrawerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/tag");
      if (!res.ok) throw new Error("Failed to fetch tags");
      const data: Tag[] = await res.json();
      setTags(data);
    } catch (err) {
      console.error(err);
      toast.error("خطا در دریافت تگ‌ها");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fetchTags, onClose]);

  const handleAdd = async () => {
    if (!name || !slug) return toast.warning("نام و اسلاگ الزامی است");
    try {
      const res = await fetch("/api/admin/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("تگ با موفقیت اضافه شد");
        setName("");
        setSlug("");
        fetchTags();
      } else {
        toast.error(data.error || "خطا در افزودن تگ");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در افزودن تگ");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این تگ مطمئن هستید؟")) return;
    try {
      const res = await fetch(`/api/admin/tag/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("تگ حذف شد");
        fetchTags();
      } else {
        const data = await res.json();
        toast.error(data.error || "خطا در حذف تگ");
      }
    } catch (err) {
      console.error(err);
      toast.error("خطا در حذف تگ");
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
          <h2 className="text-base font-semibold">مدیریت تگ‌ها</h2>
          <button
            aria-label="بستن پنجره"
            onClick={onClose}
            className="text-gray-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="mb-4 space-y-2">
          <input
            type="text"
            placeholder="نام تگ"
            className="w-full bg-white text-black border border-gray-400 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="اسلاگ (مثلاً: action)"
            className="w-full bg-white text-black border border-gray-400 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-blue-400 outline-none"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md text-xs transition"
          >
            افزودن تگ جدید
          </button>
        </div>

        {/* List */}
        <div className=" bg-white/20 backdrop-blur-md border border-white/30 shadow-lg p-2 rounded-2xl  transition-all duration-300 h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              در حال بارگذاری...
            </div>
          ) : tags.length === 0 ? (
            <p className="text-gray-400 text-xs text-center">
              هنوز هیچ تگی وجود ندارد.
            </p>
          ) : (
            <ul className="space-y-1 max-h-[50vh] grid grid-cols-2 gap-5">
              {tags.map((tag) => (
                <li
                  key={tag._id}
                  className="flex justify-between items-center hover:bg-gray-700 p-2 rounded-md text-xs border-2"
                >
                  <span className="font-medium">{tag.name}</span>
                  <button
                    onClick={() => handleDelete(tag._id)}
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
    </div>
  );
}

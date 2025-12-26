"use client";

import * as yup from "yup";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { Category, Product, ProductForm, Tag } from "@/types";
import {
  CategorySelector,
  GalleryUploader,
  ImageUploader,
  TagsSelector,
  SpecificationsEditor,
  BasicInfoFields,
} from "../modals";
import { productValidationSchema } from "@/validations/validation";

interface Props {
  onClose: () => void;
  onSave?: (newProduct: Product) => void;
  product?: Product | null;
}

export default function AddProductDrawer({ onClose, onSave, product }: Props) {
  const [form, setForm] = useState<ProductForm>({
    title: product?.title || "",
    slug: product?.slug || "",
    price: product?.price || 0,
    discountPrice: product?.discountPrice || null,
    stock: product?.stock || 0,
    brand: product?.brand || "",
    description: product?.description || "",
    shortDesc: product?.shortDesc || "",
    category: product?.category?._id || "",
    mainImage: product?.mainImage || "",
    galleryImages: product?.images || [],
    tags: product?.tags?.map((t: Tag) => t._id) || [],
    specifications: product?.specifications || [],
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/category")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => toast.error("خطا در دریافت دسته‌بندی‌ها"));
  }, []);

  const updateField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  // ---------------------------
  // ⬆⬆⬆ تگ
  // ---------------------------
  const [tagsList, setTagsList] = useState<Tag[]>([]); // لیست تگ‌ها

  useEffect(() => {
    fetch("/api/admin/tag")
      .then((res) => res.json())
      .then(setTagsList)
      .catch(() => toast.error("خطا در دریافت تگ‌ها"));
  }, []);
  // ==========================
  // 📌 Upadte
  // ==========================
  const handleUpdate = async (): Promise<void> => {
    try {
      productValidationSchema.validateSync(form, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((e) => toast.error(e.message));
      } else {
        toast.error("خطای ناشناخته");
      }
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/product/${product?._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      const updatedProduct = await res.json();

      await onSave?.(updatedProduct);

      toast.success("محصول با موفقیت بروزرسانی شد");
      onClose();
    } catch {
      toast.error("خطا در بروزرسانی محصول");
    } finally {
      setLoading(false);
    }
  };
  // ---------------------------
  // ⬆⬆⬆ Submit
  // ---------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      productValidationSchema.validateSync(form, { abortEarly: false });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        err.inner.forEach((e) => toast.error(e.message));
      } else {
        toast.error("خطای ناشناخته");
      }
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      await onSave?.(data.product);

      if (res.ok) {
        toast.success("محصول با موفقیت اضافه شد");

        setForm({
          title: "",
          slug: "",
          price: 0,
          discountPrice: undefined,
          stock: 0,
          brand: "",
          description: "",
          shortDesc: "",
          category: undefined,
          mainImage: "",
          galleryImages: [],
          specifications: [],
          tags: [],
        });
        onClose();
      } else {
        toast.error(data.error || "خطا در اضافه کردن محصول");
        toast.error(data.message.errorResponse.errmsg);

        console.log(data.error);
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>

      <div className="relative bg-indigo-600  text-white w-96 p-6 overflow-y-auto">
        <button
          title="close"
          onClick={onClose}
          className="absolute top-4 left-4"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-xl mb-4 font-bold">افزودن محصول جدید</h2>

        <form
          className="flex flex-col gap-3"
          onSubmit={product ? handleUpdate : handleSubmit}
        >
          {/* فیلدهای  */}

          <BasicInfoFields form={form} updateField={updateField} />
          {/* دسته‌بندی */}
          <CategorySelector
            form={form}
            updateField={updateField}
            categories={categories}
          />

          {/* عکس اصلی */}
          <GalleryUploader form={form} updateField={updateField} />

          {/* گالری */}
          <ImageUploader form={form} updateField={updateField} />
          {/* تگ‌ها */}

          <TagsSelector
            form={form}
            updateField={updateField}
            tagsList={tagsList}
          />

          {/* مشخصات */}
          <SpecificationsEditor form={form} updateField={updateField} />

          {/* دکمه ذخیره */}
          {product ? (
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 p-2 rounded"
            >
              {loading ? "در حال آپدیت..." : "آپدیت"}
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 p-2 rounded"
            >
              {loading ? "در حال ذخیره..." : "ذخیره"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

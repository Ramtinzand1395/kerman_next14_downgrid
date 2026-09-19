"use client";

import { ProductForm } from "@/types";
import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { useState } from "react";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";

interface GalleryUploaderProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}
const GalleryUploader = ({ form, updateField }: GalleryUploaderProps) => {
  const [loadingImage, setLoadingImage] = useState(false);

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImage(true);
    toast.info("در حال آپلود تصویر...");

    try {
      const url = await uploadCloudinaryImage(file);
      updateField("mainImage", url);
      toast.success("تصویر اصلی آپلود شد");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "خطا در آپلود تصویر اصلی",
      );
    } finally {
      setLoadingImage(false);
      e.target.value = "";
    }
  };

  if (loadingImage) return "در حال بارگذاری تصویر";
  return (
    <div>
      <div className="flex flex-col">
        <label className="font-medium">تصویر اصلی</label>
        {form.mainImage && (
          <ProductImage
            width={50}
            height={50}
            alt={form.mainImageAlt || form.title || "تصویر اصلی محصول"}
            src={form.mainImage}
            sizes="208px"
            className="w-52 h-32 object-contain mt-2 rounded"
          />
        )}
        <input
          title="تصویر اصلی"
          className="border-blue-500 border-2 rounded-2xl p-2 w-fit"
          type="file"
          accept="image/*"
          onChange={handleMainImage}
        />
      </div>
    </div>
  );
};

export default GalleryUploader;

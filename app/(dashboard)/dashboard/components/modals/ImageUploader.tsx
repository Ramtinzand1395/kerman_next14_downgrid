"use client";

import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { ProductForm } from "@/types";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

interface ImageUploaderProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const ImageUploader = ({ form, updateField }: ImageUploaderProps) => {
  const [loadingImage, setLoadingImage] = useState(false);

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setLoadingImage(true);
    toast.info("در حال آپلود تصاویر...");

    try {
      const uploaded = await Promise.all(files.map(uploadCloudinaryImage));
      const newImages = uploaded.map((url) => ({
        url,
        alt: `تصویر گالری ${form.title || "محصول"}`,
      }));

      updateField("galleryImages", [...form.galleryImages, ...newImages]);
      toast.success("تصاویر گالری آپلود شد");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در آپلود تصاویر");
    } finally {
      setLoadingImage(false);
    }
  };

  const deleteImage = (index: number) => {
    const updatedImages = [...form.galleryImages];
    updatedImages.splice(index, 1);
    updateField("galleryImages", updatedImages);
  };

  const updateImageAlt = (index: number, alt: string) => {
    const updatedImages = form.galleryImages.map((img, i) =>
      i === index ? { ...img, alt } : img,
    );
    updateField("galleryImages", updatedImages);
  };

  if (loadingImage) return "در حال بارگذاری تصاویر";

  return (
    <div className="borert my-10">
      <div className="mt-5 flex flex-col">
        <label className="font-medium">گالری تصاویر</label>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {form.galleryImages.length > 0 ? (
            form.galleryImages.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                className="group relative rounded border p-2"
              >
                <Image
                  width={300}
                  height={200}
                  src={img.url}
                  alt={img.alt || form.title || `تصویر ${i + 1}`}
                  className="h-24 w-full rounded object-contain"
                />
                <button
                  type="button"
                  title="حذف تصویر"
                  onClick={() => deleteImage(i)}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
                <input
                  type="text"
                  value={img.alt || ""}
                  onChange={(e) => updateImageAlt(i, e.target.value)}
                  className="mt-2 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs"
                  placeholder="متن ALT این تصویر"
                />
              </div>
            ))
          ) : (
            <p className="text-xs">گالری تصاویر خالی است.</p>
          )}
        </div>
        <input
          title="عکس محصول"
          type="file"
          multiple
          accept="image/*"
          onChange={handleGallery}
          className="mt-2 w-fit rounded-2xl border-2 border-blue-500 p-2"
        />
      </div>
    </div>
  );
};

export default ImageUploader;

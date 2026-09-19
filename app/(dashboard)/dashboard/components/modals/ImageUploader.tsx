"use client";
import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { ProductForm } from "@/types";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";

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
      toast.error(
        error instanceof Error ? error.message : "خطا در آپلود تصاویر گالری",
      );
    } finally {
      setLoadingImage(false);
      e.target.value = "";
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
      {/* Gallery Images */}
      <div className="flex flex-col mt-5">
        <label className="font-medium">گالری تصاویر</label>

        {/* <div className="grid grid-cols-6 gap-2 mt-2"> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {form.galleryImages.length > 0 ? (
            form.galleryImages.map((img, i) => (
              <div
                key={`${img.url}-${i}`}
                className="relative group rounded border p-2"
              >
                <ProductImage
                  width={300}
                  height={200}
                  src={img.url}
                  alt={img.alt || form.title || `تصویر ${i + 1}`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  className="w-full h-24 object-contain rounded"
                />
                <button
                  type="button"
                  title="حذف محصول"
                  onClick={() => deleteImage(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
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
          className="border-blue-500 border-2 rounded-2xl p-2 w-fit mt-2"
        />
      </div>
    </div>
  );
};

export default ImageUploader;

"use client";
import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { ProductForm } from "@/types";
import { Images, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useId, useState } from "react";
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
  const uploadId = useId();

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setLoadingImage(true);
    toast.info("آپلود تصاویر گالری آغاز شد…");

    try {
      const uploaded = await Promise.all(files.map(uploadCloudinaryImage));
      const newImages = uploaded.map((url) => ({
        url,
        alt: `تصویر گالری ${form.title || "محصول"}`,
      }));

      updateField("galleryImages", [...form.galleryImages, ...newImages]);
      toast.success("تصاویر گالری آپلود و آماده استفاده شدند.");
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

  return (
    <div className="space-y-4 border-t border-slate-800 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Images className="h-4 w-4 text-lime-300" /> گالری تصاویر</h4>
          <p className="mt-1 text-xs leading-6 text-slate-400">زاویه‌های دیگر، جزئیات و ایرادهای ظاهری کالا را نشان دهید.</p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">{form.galleryImages.length.toLocaleString("fa-IR")} تصویر</span>
      </div>

      {form.galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {form.galleryImages.map((img, index) => (
            <div key={img.url + "-" + index} className="min-w-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-950/50">
              <div className="relative flex h-32 items-center justify-center bg-slate-800/50 p-2">
                <ProductImage width={320} height={220} src={img.url}
                  alt={img.alt || form.title || "تصویر محصول"}
                  sizes="(max-width: 640px) 50vw, 33vw" className="h-full w-full rounded object-contain" />
                <button type="button" title="حذف تصویر" aria-label={"حذف تصویر " + (index + 1).toLocaleString("fa-IR")}
                  onClick={() => deleteImage(index)}
                  className="absolute left-2 top-2 rounded-lg bg-rose-600 p-1.5 text-white shadow-md transition hover:bg-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input type="text" aria-label={"متن جایگزین تصویر " + (index + 1).toLocaleString("fa-IR")}
                value={img.alt || ""} onChange={event => updateImageAlt(index, event.target.value)}
                className="w-full border-t border-slate-700 bg-transparent px-3 py-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:bg-slate-800"
                placeholder="توضیح تصویر (ALT)" />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-400">هنوز تصویر دیگری برای محصول ثبت نشده است.</p>
      )}

      <label htmlFor={uploadId} className={"flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-lime-400/40 bg-lime-400/10 px-4 py-4 text-sm font-semibold text-lime-200 transition hover:bg-lime-400/15 " + (loadingImage ? "pointer-events-none opacity-50" : "")}>
        {loadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        {loadingImage ? "در حال آپلود تصاویر..." : "افزودن چند تصویر به گالری"}
        <input id={uploadId} title="افزودن تصاویر گالری" type="file" multiple accept="image/*"
          disabled={loadingImage} onChange={handleGallery} className="sr-only" />
      </label>
    </div>
  );
};
export default ImageUploader;

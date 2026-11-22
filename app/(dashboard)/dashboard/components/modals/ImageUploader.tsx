"use client";
import { uploadCloudinaryImage, PRODUCT_IMAGE_ACCEPT } from "@/helpers/uploadCloudinaryImage";
import { ProductForm } from "@/types";
import { Images, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";

interface ImageUploaderProps {
  form: ProductForm;
  onUploadingChange?: (uploading: boolean) => void;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const ImageUploader = ({ form, updateField, onUploadingChange }: ImageUploaderProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const uploadId = useId();

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setLoadingImage(true);
    onUploadingChange?.(true);
    setUploadError(null);

    try {
      // Keep successful pictures even when another file in the batch fails.
      const results = await Promise.allSettled(files.map(uploadCloudinaryImage));
      const newImages = results.flatMap((result, index) =>
        result.status === "fulfilled"
          ? [{ url: result.value, alt: `تصویر گالری ${form.title || "محصول"}` }]
          : [],
      );
      if (newImages.length) {
        updateField("galleryImages", [...form.galleryImages, ...newImages]);
        toast.success(`${newImages.length.toLocaleString("fa-IR")} تصویر به گالری اضافه شد.`);
      }
      const failed = results.flatMap((result, index) =>
        result.status === "rejected"
          ? [`«${files[index].name}»: ${result.reason instanceof Error ? result.reason.message : "آپلود انجام نشد"}`]
          : [],
      );
      if (failed.length) {
        const message = `${failed.length.toLocaleString("fa-IR")} تصویر بارگذاری نشد:\n${failed.join("\n")}`;
        setUploadError(message);
        toast.error("برخی تصاویر بارگذاری نشدند. جزئیات را زیر گالری ببینید.");
      }
    } finally {
      setLoadingImage(false);
      onUploadingChange?.(false);
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
    <div className="space-y-4 border-t border-slate-100 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Images className="h-4 w-4 text-teal-700" /> گالری تصاویر</h4>
          <p className="mt-1 text-xs leading-6 text-slate-500">زاویه‌های دیگر، جزئیات و ایرادهای ظاهری کالا را نشان دهید.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">{form.galleryImages.length.toLocaleString("fa-IR")} تصویر</span>
      </div>

      {uploadError && <p role="alert" className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-7 text-rose-800">{uploadError}</p>}
      {form.galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {form.galleryImages.map((img, index) => (
            <div key={img.url + "-" + index} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="relative flex h-32 items-center justify-center bg-slate-100 p-2">
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
                className="w-full border-t border-slate-200 bg-transparent px-3 py-2.5 text-xs text-slate-900 outline-none placeholder:text-slate-500 focus:bg-slate-100"
                placeholder="توضیح تصویر (ALT)" />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">هنوز تصویر دیگری برای محصول ثبت نشده است.</p>
      )}

      <label htmlFor={uploadId} className={"flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-300 bg-teal-50 px-4 py-4 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 " + (loadingImage ? "pointer-events-none opacity-50" : "")}>
        {loadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        {loadingImage ? "در حال آپلود تصاویر..." : "افزودن چند تصویر به گالری"}
        <input id={uploadId} title="افزودن تصاویر گالری" type="file" multiple accept={PRODUCT_IMAGE_ACCEPT}
          disabled={loadingImage} onChange={handleGallery} className="sr-only" />
      </label>
      <p className="text-xs text-slate-500">فرمت مجاز: JPG، PNG، WebP، GIF یا AVIF؛ حداکثر ۱۰ مگابایت برای هر عکس.</p>
    </div>
  );
};
export default ImageUploader;

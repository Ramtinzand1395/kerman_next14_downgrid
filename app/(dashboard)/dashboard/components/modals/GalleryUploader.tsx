"use client";

import { ProductForm } from "@/types";
import { uploadCloudinaryImage, PRODUCT_IMAGE_ACCEPT } from "@/helpers/uploadCloudinaryImage";
import { useId, useState } from "react";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";

interface GalleryUploaderProps {
  form: ProductForm;
  onUploadingChange?: (uploading: boolean) => void;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}
const GalleryUploader = ({ form, updateField, onUploadingChange }: GalleryUploaderProps) => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const uploadId = useId();

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setLoadingImage(true);
    onUploadingChange?.(true);

    try {
      const url = await uploadCloudinaryImage(file);
      updateField("mainImage", url);
      toast.success("تصویر اصلی آپلود و آماده استفاده شد.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تصویر اصلی آپلود نشد. یک فایل تصویری معتبر انتخاب کنید.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setLoadingImage(false);
      onUploadingChange?.(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-900">تصویر اصلی محصول <span className="text-rose-400">*</span></h4>
          <span className="text-xs text-slate-500">مهم‌ترین تصویر برای مشتری</span>
        </div>
        <p className="mt-1 text-xs leading-6 text-slate-500">برای پیش‌نویس اختیاری است. هنگام انتشار باید تصویر اصلی داشته باشید.</p>
      </div>
      {uploadError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm leading-6 text-rose-800">{uploadError}</p>}
      {form.mainImage ? (
        <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-teal-200 bg-slate-50 p-4 sm:flex-row">
          <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:w-44">
            <ProductImage width={320} height={240} src={form.mainImage}
              alt={form.mainImageAlt || form.title || "تصویر اصلی محصول"}
              sizes="(max-width: 640px) 100vw, 176px" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><ImagePlus className="h-4 w-4" /> تصویر اصلی انتخاب شده</p>
            <p className="mt-2 text-xs leading-6 text-slate-500">می‌توانید عکس را عوض کنید یا در صورت پیش‌نویس بودن حذفش کنید.</p>
            <button type="button" onClick={() => updateField("mainImage", "")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
              <Trash2 className="h-3.5 w-3.5" /> حذف تصویر اصلی
            </button>
          </div>
        </div>
      ) : null}
      <label htmlFor={uploadId} className={"flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/70 px-4 py-6 text-center transition hover:border-teal-500 hover:bg-teal-50 " + (loadingImage ? "pointer-events-none opacity-60" : "")}>
        {loadingImage ? <Loader2 className="h-7 w-7 animate-spin text-teal-700" /> : <UploadCloud className="h-7 w-7 text-teal-700" />}
        <strong className="text-sm text-slate-900">{loadingImage ? "در حال آپلود تصویر..." : form.mainImage ? "جایگزین‌کردن عکس اصلی" : "انتخاب تصویر اصلی"}</strong>
        <span className="text-xs text-slate-500">JPG، PNG، WebP، GIF یا AVIF؛ حداکثر ۱۰ مگابایت</span>
        <input id={uploadId} type="file" accept={PRODUCT_IMAGE_ACCEPT} disabled={loadingImage}
          onChange={handleMainImage} className="sr-only" />
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        متن جایگزین عکس (ALT)
        <input type="text" value={form.mainImageAlt || ""} onChange={event => updateField("mainImageAlt", event.target.value)}
          placeholder="توصیف کوتاه و واقعی از تصویر محصول"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-500" />
      </label>
    </div>
  );
};
export default GalleryUploader;

"use client";

import { ProductForm } from "@/types";
import { uploadCloudinaryImage } from "@/helpers/uploadCloudinaryImage";
import { useId, useState } from "react";
import { toast } from "react-toastify";
import ProductImage from "@/app/components/ProductImage";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";

interface GalleryUploaderProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}
const GalleryUploader = ({ form, updateField }: GalleryUploaderProps) => {
  const [loadingImage, setLoadingImage] = useState(false);
  const uploadId = useId();

  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImage(true);
    toast.info("آپلود تصویر اصلی آغاز شد…");

    try {
      const url = await uploadCloudinaryImage(file);
      updateField("mainImage", url);
      toast.success("تصویر اصلی آپلود و آماده استفاده شد.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "خطا در آپلود تصویر اصلی",
      );
    } finally {
      setLoadingImage(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-100">تصویر اصلی محصول <span className="text-rose-400">*</span></h4>
          <span className="text-xs text-slate-400">مهم‌ترین تصویر برای مشتری</span>
        </div>
        <p className="mt-1 text-xs leading-6 text-slate-400">برای پیش‌نویس اختیاری است. هنگام انتشار باید تصویر اصلی داشته باشید.</p>
      </div>
      {form.mainImage ? (
        <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-lime-400/30 bg-slate-950/50 p-4 sm:flex-row">
          <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 sm:w-44">
            <ProductImage width={320} height={240} src={form.mainImage}
              alt={form.mainImageAlt || form.title || "تصویر اصلی محصول"}
              sizes="(max-width: 640px) 100vw, 176px" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-300"><ImagePlus className="h-4 w-4" /> تصویر اصلی انتخاب شده</p>
            <p className="mt-2 text-xs leading-6 text-slate-400">می‌توانید عکس را عوض کنید یا در صورت پیش‌نویس بودن حذفش کنید.</p>
            <button type="button" onClick={() => updateField("mainImage", "")}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10">
              <Trash2 className="h-3.5 w-3.5" /> حذف تصویر اصلی
            </button>
          </div>
        </div>
      ) : null}
      <label htmlFor={uploadId} className={"flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lime-400/40 bg-lime-400/5 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-lime-400/10 " + (loadingImage ? "pointer-events-none opacity-60" : "")}>
        {loadingImage ? <Loader2 className="h-7 w-7 animate-spin text-lime-300" /> : <UploadCloud className="h-7 w-7 text-lime-300" />}
        <strong className="text-sm text-slate-100">{loadingImage ? "در حال آپلود تصویر..." : form.mainImage ? "جایگزین‌کردن عکس اصلی" : "انتخاب تصویر اصلی"}</strong>
        <span className="text-xs text-slate-400">فایل تصویری را از دستگاه خود انتخاب کنید</span>
        <input id={uploadId} type="file" accept="image/*" disabled={loadingImage}
          onChange={handleMainImage} className="sr-only" />
      </label>
      <label className="block text-xs font-semibold text-slate-300">
        متن جایگزین عکس (ALT)
        <input type="text" value={form.mainImageAlt || ""} onChange={event => updateField("mainImageAlt", event.target.value)}
          placeholder="توصیف کوتاه و واقعی از تصویر محصول"
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-lime-400" />
      </label>
    </div>
  );
};
export default GalleryUploader;

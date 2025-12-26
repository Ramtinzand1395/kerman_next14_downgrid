"use client";

import { ProductForm } from "@/types";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";
 

interface GalleryUploaderProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => void;
}
const GalleryUploader = ({ form, updateField }: GalleryUploaderProps) => {
  const [LoadingImage, setLoadingImage] = useState(false);
  const uploadToCloudinary = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET!);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload`,
      { method: "POST", body: fd }
    );
    const data = await res.json();
    return data.secure_url;
  };
  const handleMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoadingImage(true);

    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("در حال آپلود تصویر...");
    const url = await uploadToCloudinary(file);
    updateField("mainImage", url);
    toast.success("تصویر اصلی آپلود شد");
    setLoadingImage(false);
  };
  if (LoadingImage) return "درحال بارگزاری تصویر";
  return (
    <div>
      <div className="flex flex-col">
        <label className="font-medium">تصویر اصلی</label>
        {form.mainImage && (
          <Image
            width={50}
            height={50}
            alt={form.title}
            src={form.mainImage}
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

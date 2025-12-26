"use client";
import { ProductForm } from "@/types";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";
 
interface ImageUploaderProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => void;
}

const ImageUploader = ({ form, updateField }: ImageUploaderProps) => {
  const [LoadingImage, setLoadingImage] = useState(false);
  // ------------------ Upload Images ------------------
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

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoadingImage(true);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    toast.info("در حال آپلود تصاویر...");
    const uploaded: string[] = await Promise.all(files.map(uploadToCloudinary));
    updateField("galleryImages", [...form.galleryImages, ...uploaded]);
    toast.success("تصاویر گالری آپلود شد");
    setLoadingImage(false);
  };

  const deleteImage = (index: number) => {
    const updatedImages = [...form.galleryImages];
    updatedImages.splice(index, 1);
    updateField("galleryImages", updatedImages);
  };
  if (LoadingImage) return "درحال بارگزاری تصویر";

  return (
    <div className="borert my-10">
      {/* Gallery Images */}
      <div className="flex flex-col mt-5">
        <label className="font-medium">گالری تصاویر</label>

        <div className="grid grid-cols-6 gap-2 mt-2">
          {form.galleryImages.length > 0 ? (
            form.galleryImages.map((img: string, i: number) => (
              <div key={i} className="relative group">
                <Image
                  width={50}
                  height={50}
                  src={img}
                  alt={form.title}
                  className="w-full h-24 object-contain rounded"
                />
                <button
                  title="حذف محصول"
                  onClick={() => deleteImage(i)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
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
          className="border-blue-500 border-2 rounded-2xl p-2 w-fit"
        />
      </div>
    </div>
  );
};

export default ImageUploader;

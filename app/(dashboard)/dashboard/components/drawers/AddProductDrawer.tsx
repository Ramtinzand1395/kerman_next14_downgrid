// // "use client";

// // import * as yup from "yup";
// // import { useEffect, useState } from "react";
// // import { Loader2, PackagePlus, X } from "lucide-react";
// // import { toast } from "react-toastify";
// // import { Category, Product, ProductForm, Tag } from "@/types";
// // import {
// //   BasicInfoFields,
// //   CategorySelector,
// //   GalleryUploader,
// //   ImageUploader,
// //   SpecificationsEditor,
// //   TagsSelector,
// // } from "../modals";
// // import { productValidationSchema } from "@/validations/validation";

// // interface Props {
// //   onClose: () => void;
// //   onSave?: (newProduct?: Product) => void | Promise<void>;
// //   product?: Product | null;
// // }

// // const initialForm: ProductForm = {
// //   title: "",
// //   slug: "",
// //   price: 0,
// //   discountPrice: null,
// //   stock: 0,
// //   brand: "",
// //   description: "",
// //   shortDesc: "",
// //   category: "",
// //   mainImage: "",
// //   galleryImages: [],
// //   tags: [],
// //   specifications: [],
// // };

// // export default function AddProductDrawer({ onClose, onSave, product }: Props) {
// //   const [form, setForm] = useState<ProductForm>({
// //     title: product?.title || initialForm.title,
// //     slug: product?.slug || initialForm.slug,
// //     price: product?.price || initialForm.price,
// //     discountPrice: product?.discountPrice ?? initialForm.discountPrice,
// //     stock: product?.stock || initialForm.stock,
// //     brand: product?.brand || initialForm.brand,
// //     description: product?.description || initialForm.description,
// //     shortDesc: product?.shortDesc || initialForm.shortDesc,
// //     category: product?.category?._id || initialForm.category,
// //     mainImage: product?.mainImage || initialForm.mainImage,
// //     galleryImages: product?.images || initialForm.galleryImages,
// //     tags: product?.tags?.map((t: Tag) => t._id) || initialForm.tags,
// //     specifications: product?.specifications || initialForm.specifications,
// //   });

// //   const [categories, setCategories] = useState<Category[]>([]);
// //   const [tagsList, setTagsList] = useState<Tag[]>([]);
// //   const [loading, setLoading] = useState(false);

// //   useEffect(() => {
// //     fetch("/api/admin/category")
// //       .then((res) => res.json())
// //       .then(setCategories)
// //       .catch(() => toast.error("خطا در دریافت دسته‌بندی‌ها"));
// //   }, []);

// //   useEffect(() => {
// //     fetch("/api/admin/tag")
// //       .then((res) => res.json())
// //       .then(setTagsList)
// //       .catch(() => toast.error("خطا در دریافت تگ‌ها"));
// //   }, []);

// //   const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
// //     setForm((prev) => ({ ...prev, [key]: value }));
// //   };

// //   const validateForm = () => {
// //     try {
// //       productValidationSchema.validateSync(form, { abortEarly: false });
// //       return true;
// //     } catch (err) {
// //       if (err instanceof yup.ValidationError) {
// //         err.inner.forEach((error) => toast.error(error.message));
// //       } else {
// //         toast.error("خطای ناشناخته");
// //       }
// //       return false;
// //     }
// //   };

// //   const handleUpdate = async (e: React.FormEvent): Promise<void> => {
// //     e.preventDefault();
// //     if (!validateForm()) return;

// //     setLoading(true);
// //     try {
// //       const res = await fetch(`/api/admin/product/${product?._id}`, {
// //         method: "PUT",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(form),
// //       });

// //       if (!res.ok) throw new Error();
// //       const updatedProduct = await res.json();

// //       await onSave?.(updatedProduct);

// //       toast.success("محصول با موفقیت بروزرسانی شد");
// //       onClose();
// //     } catch {
// //       toast.error("خطا در بروزرسانی محصول");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleSubmit = async (e: React.FormEvent) => {
// //     e.preventDefault();
// //     if (!validateForm()) return;

// //     setLoading(true);
// //     try {
// //       const res = await fetch("/api/admin/product", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(form),
// //       });

// //       const data = await res.json();

// //       if (res.ok) {
// //         await onSave?.(data.product);
// //         toast.success("محصول با موفقیت اضافه شد");
// //         setForm(initialForm);
// //         onClose();
// //       } else {
// //         toast.error(data.error || "خطا در اضافه کردن محصول");
// //         if (data?.message?.errorResponse?.errmsg) {
// //           toast.error(data.message.errorResponse.errmsg);
// //         }
// //       }
// //     } catch (err) {
// //       toast.error("خطا در ارتباط با سرور");
// //       console.log(err);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   return (
// //     <div className="fixed inset-0 z-50 flex justify-end">
// //       <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

// //       <div className="relative h-full w-full max-w-2xl overflow-y-auto border-r border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
// //         <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
// //           <div className="flex items-center justify-between">
// //             <div className="flex items-center gap-2">
// //               <PackagePlus className="h-5 w-5 text-indigo-400" />
// //               <h2 className="text-sm font-bold">{product ? "ویرایش محصول" : "افزودن محصول جدید"}</h2>
// //             </div>
// //             <button
// //               title="بستن"
// //               onClick={onClose}
// //               className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
// //             >
// //               <X className="h-4 w-4" />
// //             </button>
// //           </div>
// //         </div>

// //         <form className="space-y-4 p-6" onSubmit={product ? handleUpdate : handleSubmit}>
// //           <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
// //             <p className="mb-3 text-xs text-slate-300">اطلاعات پایه محصول</p>
// //             <BasicInfoFields form={form} updateField={updateField} />
// //           </section>

// //           <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
// //             <p className="mb-3 text-xs text-slate-300">دسته‌بندی و تگ‌ها</p>
// //             <div className="space-y-3">
// //               <CategorySelector form={form} updateField={updateField} categories={categories} />
// //               <TagsSelector form={form} updateField={updateField} tagsList={tagsList} />
// //             </div>
// //           </section>

// //           <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
// //             <p className="mb-3 text-xs text-slate-300">تصاویر محصول</p>
// //             <div className="space-y-3">
// //               <GalleryUploader form={form} updateField={updateField} />
// //               <ImageUploader form={form} updateField={updateField} />
// //             </div>
// //           </section>

// //           <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
// //             <p className="mb-3 text-xs text-slate-300">مشخصات فنی</p>
// //             <SpecificationsEditor form={form} updateField={updateField} />
// //           </section>

// //           <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
// //             <button
// //               type="submit"
// //               disabled={loading}
// //               className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
// //             >
// //               {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
// //               {loading
// //                 ? product
// //                   ? "در حال بروزرسانی..."
// //                   : "در حال ذخیره..."
// //                 : product
// //                   ? "بروزرسانی محصول"
// //                   : "ذخیره محصول"}
// //             </button>
// //           </div>
// //         </form>
// //       </div>
// //     </div>
// //   );
// // }

// "use client";

// import * as yup from "yup";
// import { useEffect, useState } from "react";
// import { ChevronDown, Loader2, PackagePlus, X } from "lucide-react";
// import { toast } from "react-toastify";
// import { Category, Product, ProductForm, Tag } from "@/types";
// import {
//   BasicInfoFields,
//   CategorySelector,
//   GalleryUploader,
//   ImageUploader,
//   SeoFields,
//   SpecificationsEditor,
//   TagsSelector,
// } from "../modals";
// import { productValidationSchema } from "@/validations/validation";
// import FaqEditor from "../modals/FaqEditor";

// interface Props {
//   onClose: () => void;
//   onSave?: (newProduct?: Product) => void | Promise<void>;
//   product?: Product | null;
// }

// const initialForm: ProductForm = {
//   title: "",
//   slug: "",
//   seoTitle: "",
//   metaDescription: "",
//   price: 0,
//   discountPrice: null,
//   stock: 0,
//   brand: "",
//   description: "",
//   shortDesc: "",
//   mainImageAlt: "",
//   category: "",
//   mainImage: "",
//   galleryImages: [],
//   tags: [],
//   specifications: [],
//   faq: [],
//   modelGuide: "",
//   compareText: "",
// };

// type SectionKey = "basic" | "taxonomy" | "media" | "specs" | "seo";

// export default function AddProductDrawer({ onClose, onSave, product }: Props) {
//   const [form, setForm] = useState<ProductForm>({
//     title: product?.title || initialForm.title,
//     slug: product?.slug || initialForm.slug,
//     seoTitle: product?.seoTitle || initialForm.seoTitle,
//     metaDescription: product?.metaDescription || initialForm.metaDescription,
//     price: product?.price || initialForm.price,
//     discountPrice: product?.discountPrice ?? initialForm.discountPrice,
//     stock: product?.stock || initialForm.stock,
//     brand: product?.brand || initialForm.brand,
//     description: product?.description || initialForm.description,
//     shortDesc: product?.shortDesc || initialForm.shortDesc,
//     mainImageAlt: product?.mainImageAlt || initialForm.mainImageAlt,
//     category: product?.category?._id || initialForm.category,
//     mainImage: product?.mainImage || initialForm.mainImage,
//     galleryImages: product?.images || initialForm.galleryImages,
//     tags: product?.tags?.map((t: Tag) => t._id) || initialForm.tags,
//     specifications: product?.specifications || initialForm.specifications,
//     faq: product?.faq || initialForm.faq,
//     modelGuide: product?.modelGuide || initialForm.modelGuide,
//     compareText: product?.compareText || initialForm.compareText,
//   });

//   const [openSection, setOpenSection] = useState<SectionKey>("basic");

//   const [categories, setCategories] = useState<Category[]>([]);
//   const [tagsList, setTagsList] = useState<Tag[]>([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     fetch("/api/admin/category")
//       .then((res) => res.json())
//       .then(setCategories)
//       .catch(() => toast.error("خطا در دریافت دسته‌بندی‌ها"));
//   }, []);

//   useEffect(() => {
//     fetch("/api/admin/tag")
//       .then((res) => res.json())
//       .then(setTagsList)
//       .catch(() => toast.error("خطا در دریافت تگ‌ها"));
//   }, []);

//   const toggleSection = (key: SectionKey) => {
//     setOpenSection((prev) => (prev === key ? prev : key));
//   };

//   const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
//     setForm((prev) => ({ ...prev, [key]: value }));
//   };

//   const validateForm = () => {
//     try {
//       productValidationSchema.validateSync(form, { abortEarly: false });
//       return true;
//     } catch (err) {
//       if (err instanceof yup.ValidationError) {
//         err.inner.forEach((error) => toast.error(error.message));
//       } else {
//         toast.error("خطای ناشناخته");
//       }
//       return false;
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent): Promise<void> => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const res = await fetch(`/api/admin/product`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(form),
//       });

//       const data = await res.json();

//       if (res.ok) {
//         await onSave?.(data.product);
//         toast.success("محصول با موفقیت اضافه شد");
//         setForm(initialForm);
//         onClose();
//       } else {
//         toast.error(data.error || "خطا در اضافه کردن محصول");
//         if (data?.message?.errorResponse?.errmsg) {
//           toast.error(data.message.errorResponse.errmsg);
//         }
//       }
//     } catch (err) {
//       toast.error("خطا در ارتباط با سرور");
//       console.log(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleUpdate = async (e: React.FormEvent): Promise<void> => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       const res = await fetch(`/api/admin/product/${product?._id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(form),
//       });

//       const data = await res.json();

//       if (res.ok) {
//         await onSave?.(data.product);
//         toast.success("محصول با موفقیت اضافه شد");
//         setForm(initialForm);
//         onClose();
//       } else {
//         toast.error(data.error || "خطا در اضافه کردن محصول");
//         if (data?.message?.errorResponse?.errmsg) {
//           toast.error(data.message.errorResponse.errmsg);
//         }
//       }
//     } catch (err) {
//       toast.error("خطا در ارتباط با سرور");
//       console.log(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const Section = ({
//     title,
//     sectionKey,
//     children,
//   }: {
//     title: string;
//     sectionKey: SectionKey;
//     children: React.ReactNode;
//   }) => (
//     <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
//       <button
//         type="button"
//         onClick={() => toggleSection(sectionKey)}
//         className="mb-3 flex w-full items-center justify-between text-right text-xs font-semibold text-slate-200"
//       >
//         {title}
//         <ChevronDown
//           className={`h-4 w-4 transition-transform ${openSection === sectionKey ? "rotate-180" : ""}`}
//         />
//       </button>
//       {openSection === sectionKey ? children : null}
//     </section>
//   );

//   return (
//     <div className="fixed inset-0 z-50 flex justify-end">
//       <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

//       <div className="relative h-full w-full max-w-2xl overflow-y-auto border-r border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
//         <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <PackagePlus className="h-5 w-5 text-indigo-400" />
//               <h2 className="text-sm font-bold">{product ? "ویرایش محصول" : "افزودن محصول جدید"}</h2>
//             </div>
//             <button
//               title="بستن"
//               onClick={onClose}
//               className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
//             >
//               <X className="h-4 w-4" />
//             </button>
//           </div>
//         </div>

//         <form className="space-y-4 p-6" onSubmit={product ? handleUpdate : handleSubmit}>
//           <Section title="اطلاعات پایه محصول" sectionKey="basic">
//             <BasicInfoFields form={form} updateField={updateField} />
//           </Section>

//           <Section title="دسته‌بندی و تگ‌ها" sectionKey="taxonomy">
//             <div className="space-y-3">
//               <CategorySelector form={form} updateField={updateField} categories={categories} />
//               <TagsSelector form={form} updateField={updateField} tagsList={tagsList} />
//             </div>
//           </Section>

//           <Section title="تصاویر محصول" sectionKey="media">
//             <div className="space-y-3">
//               <GalleryUploader form={form} updateField={updateField} />
//               <ImageUploader form={form} updateField={updateField} />
//             </div>
//           </Section>

//           <Section title="مشخصات فنی" sectionKey="specs">
//             <SpecificationsEditor form={form} updateField={updateField} />
//           </Section>

//           <Section title="تنظیمات سئو و محتوای محصول" sectionKey="seo">
//             <div className="space-y-4">
//               <SeoFields form={form} updateField={updateField} />
//               <FaqEditor form={form} updateField={updateField} />
//             </div>
//           </Section>

//           <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
//             <button
//               type="submit"
//               disabled={loading}
//               className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
//             >
//               {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
//               {loading
//                 ? product
//                   ? "در حال بروزرسانی..."
//                   : "در حال ذخیره..."
//                 : product
//                   ? "بروزرسانی محصول"
//                   : "ذخیره محصول"}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ChevronDown,
  Loader2,
  PackagePlus,
  X,
} from "lucide-react";

import type { ProductForm, Tag } from "@/types"; // مسیر تایپ‌ها را مطابق پروژه تنظیم کن
import BasicInfoFields from "../modals/BasicInfoFields";
import CategorySelector from "../modals/CategorySelector";
import TagsSelector from "../modals/TagsSelector";
import GalleryUploader from "../modals/GalleryUploader";
import ImageUploader from "../modals/ImageUploader";
import SpecificationsEditor from "../modals/SpecificationsEditor";
import SeoFields from "../modals/SeoFields";
import FaqEditor from "../modals/FaqEditor";

// ... سایر import های فایل خودت (اگر داری) همینجا بماند

interface Props {
  onClose: () => void;
  onSave?: (p: any) => Promise<void> | void; // اگر تایپ دقیق داری جایگزین کن
  product?: any; // اگر تایپ دقیق داری جایگزین کن
}

const initialForm: ProductForm = {
  title: "",
  slug: "",
  seoTitle: "",
  metaDescription: "",
  price: 0,
  discountPrice: null,
  stock: 0,
  brand: "",
  description: "",
  shortDesc: "",
  mainImageAlt: "",
  category: "",
  mainImage: "",
  galleryImages: [],
  tags: [],
  specifications: [],
  faq: [],
  modelGuide: "",
  compareText: "",
};

type SectionKey = "basic" | "taxonomy" | "media" | "specs" | "seo";

interface DrawerSectionProps {
  title: string;
  sectionKey: SectionKey;
  openSection: SectionKey;
  onToggle: (key: SectionKey) => void;
  children: React.ReactNode;
}

const DrawerSection = ({
  title,
  sectionKey,
  openSection,
  onToggle,
  children,
}: DrawerSectionProps) => (
  <section className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      className="mb-3 flex w-full items-center justify-between text-right text-xs font-semibold text-slate-200"
    >
      {title}
      <ChevronDown
        className={`h-4 w-4 transition-transform ${
          openSection === sectionKey ? "rotate-180" : ""
        }`}
      />
    </button>
    {openSection === sectionKey ? children : null}
  </section>
);

export default function AddProductDrawer({ onClose, onSave, product }: Props) {
  const [form, setForm] = useState<ProductForm>({
    title: product?.title || initialForm.title,
    slug: product?.slug || initialForm.slug,
    seoTitle: product?.seoTitle || initialForm.seoTitle,
    metaDescription: product?.metaDescription || initialForm.metaDescription,
    price: product?.price || initialForm.price,
    discountPrice: product?.discountPrice ?? initialForm.discountPrice,
    stock: product?.stock || initialForm.stock,
    brand: product?.brand || initialForm.brand,
    description: product?.description || initialForm.description,
    shortDesc: product?.shortDesc || initialForm.shortDesc,
    mainImageAlt: product?.mainImageAlt || initialForm.mainImageAlt,
    category: product?.category?._id || initialForm.category,
    mainImage: product?.mainImage || initialForm.mainImage,
    galleryImages: product?.images || initialForm.galleryImages,
    tags: product?.tags?.map((t: Tag) => t._id) || initialForm.tags,
    specifications: product?.specifications || initialForm.specifications,
    faq: product?.faq || initialForm.faq,
    modelGuide: product?.modelGuide || initialForm.modelGuide,
    compareText: product?.compareText || initialForm.compareText,
  });

  const [openSection, setOpenSection] = useState<SectionKey>("basic");

  // ✅ اینا در فایل اصلی خودت وجود دارن، فقط اینجا نگهشون دار:
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tagsList, setTagsList] = useState<any[]>([]);

  const toggleSection = (key: SectionKey) => {
    setOpenSection((prev) => (prev === key ? prev : key));
  };

  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ----- handleSubmit / handleUpdate و بقیه منطق فایل خودت همینجا بمونه -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        await onSave?.(data.product);
        toast.success("محصول با موفقیت اضافه شد");
        setForm(initialForm);
        onClose();
      } else {
        toast.error(data.error || "خطا در اضافه کردن محصول");
        if (data?.message?.errorResponse?.errmsg) {
          toast.error(data.message.errorResponse.errmsg);
        }
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${product?._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        await onSave?.(data.product);
        toast.success("محصول با موفقیت بروزرسانی شد");
        onClose();
      } else {
        toast.error(data.error || "خطا در بروزرسانی محصول");
        if (data?.message?.errorResponse?.errmsg) {
          toast.error(data.message.errorResponse.errmsg);
        }
      }
    } catch (err) {
      toast.error("خطا در ارتباط با سرور");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  // ----------------------------------------------------------------------

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-r border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-indigo-400" />
              <h2 className="text-sm font-bold">
                {product ? "ویرایش محصول" : "افزودن محصول جدید"}
              </h2>
            </div>
            <button
              title="بستن"
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form className="space-y-4 p-6" onSubmit={product ? handleUpdate : handleSubmit}>
          <DrawerSection
            title="اطلاعات پایه محصول"
            sectionKey="basic"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <BasicInfoFields form={form} updateField={updateField} />
          </DrawerSection>

          <DrawerSection
            title="دسته‌بندی و تگ‌ها"
            sectionKey="taxonomy"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              <CategorySelector
                form={form}
                updateField={updateField}
                categories={categories}
              />
              <TagsSelector form={form} updateField={updateField} tagsList={tagsList} />
            </div>
          </DrawerSection>

          <DrawerSection
            title="تصاویر محصول"
            sectionKey="media"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-3">
              <GalleryUploader form={form} updateField={updateField} />
              <ImageUploader form={form} updateField={updateField} />
            </div>
          </DrawerSection>

          <DrawerSection
            title="مشخصات فنی"
            sectionKey="specs"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <SpecificationsEditor form={form} updateField={updateField} />
          </DrawerSection>

          <DrawerSection
            title="تنظیمات سئو و محتوای محصول"
            sectionKey="seo"
            openSection={openSection}
            onToggle={toggleSection}
          >
            <div className="space-y-4">
              <SeoFields form={form} updateField={updateField} />
              <FaqEditor form={form} updateField={updateField} />
            </div>
          </DrawerSection>

          <div className="sticky bottom-0 -mx-6 mt-6 border-t border-slate-700 bg-slate-900/95 px-6 py-4 backdrop-blur">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-semibold transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading
                ? product
                  ? "در حال بروزرسانی..."
                  : "در حال ذخیره..."
                : product
                  ? "بروزرسانی محصول"
                  : "ذخیره محصول"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

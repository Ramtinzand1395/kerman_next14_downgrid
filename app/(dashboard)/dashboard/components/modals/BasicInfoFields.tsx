// "use client";

// import { ProductForm } from "@/types";



// interface BasicInfoFieldsProps {
//   form: ProductForm;
//   updateField: <K extends keyof ProductForm>(
//     key: K,
//     value: ProductForm[K]
//   ) => void;
// }

// const fieldLabels: Record<keyof ProductForm, string> = {
//   title: "عنوان محصول",
//   slug: "اسلاگ",
//   price: "قیمت",
//   discountPrice: "قیمت تخفیف",
//   stock: "موجودی",
//   brand: "برند",
//   description: "توضیحات",
//   shortDesc: "توضیح کوتاه",
//   category: "دسته‌بندی",
//   mainImage: "تصویر اصلی",
//   galleryImages: "گالری تصاویر",
//   tags: "تگ‌ها",
//   specifications: "مشخصات",
// };

// const BasicInfoFields = ({ form, updateField }: BasicInfoFieldsProps) => {
//   const textFields: (keyof ProductForm)[] = [
//     "title",
//     "slug",
//     "brand",
//     "shortDesc",
//   ];
//   const numberFields: (keyof ProductForm)[] = [
//     "price",
//     "discountPrice",
//     "stock",
//   ];

//   return (
//     <div
//       className="grid grid-cols-2 gap-5 
//       bg-white/20 backdrop-blur-md 
//       border border-white/30 
//       shadow-lg p-5 rounded-2xl
//       transition-all duration-300"
//     >
//       <h3 className="col-span-2 my-2 text-sm font-semibold">اطلاعات اصلی</h3>

//       {/* فیلدهای متنی */}
//       {textFields.map((field) => (
//         <div key={field} className="relative w-full my-2">
//           <input
//             title="فیلدهای متنی "
//             type="text"
//             value={(form[field] as string) || ""}
//             onChange={(e) => updateField(field, e.target.value)}
//             className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
//           />
//           <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
//             {fieldLabels[field]}
//           </label>
//         </div>
//       ))}

//       {/* فیلدهای عددی */}
//       {numberFields.map((field) => (
//         <div key={field} className="relative w-full my-2">
//           <input
//             title="فیلد های عدی"
//             type="number"
//             value={(form[field] as number) ?? ""}
//             onChange={(e) =>
//               updateField(field as keyof ProductForm, Number(e.target.value))
//             }
//             className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
//           />
//           <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
//             {fieldLabels[field]}
//           </label>
//         </div>
//       ))}
//       {/* textarea توضیحات */}
//       <div className="relative w-full col-span-2 my-2">
//         <textarea
//           title="توضیحات"
//           className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
//           rows={2}
//           value={form.description}
//           onChange={(e) => updateField("description", e.target.value)}
//         />
//         <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
//           توضیحات
//         </label>
//       </div>
//     </div>
//   );
// };

// export default BasicInfoFields;

"use client";

import { useEffect, useState } from "react";
import { ProductForm } from "@/types";

interface BasicInfoFieldsProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
}

const fieldLabels: Record<keyof ProductForm, string> = {
  title: "عنوان محصول",
  slug: "اسلاگ",
  price: "قیمت",
  discountPrice: "قیمت تخفیف",
  stock: "موجودی",
  brand: "برند",
  description: "توضیحات",
  shortDesc: "توضیح کوتاه",
  category: "دسته‌بندی",
  mainImage: "تصویر اصلی",
  galleryImages: "گالری تصاویر",
  tags: "تگ‌ها",
  specifications: "مشخصات",
};

const BasicInfoFields = ({ form, updateField }: BasicInfoFieldsProps) => {
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(
    form.discountPrice !== null && form.discountPrice !== undefined
  );

  useEffect(() => {
    setIsDiscountEnabled(
      form.discountPrice !== null && form.discountPrice !== undefined
    );
  }, [form.discountPrice]);

  const textFields: (keyof ProductForm)[] = ["title", "slug", "brand", "shortDesc"];
  const numberFields: (keyof ProductForm)[] = ["price", "stock"];

  return (
    <div
      className="grid grid-cols-2 gap-5 
      bg-white/20 backdrop-blur-md 
      border border-white/30 
      shadow-lg p-5 rounded-2xl
      transition-all duration-300"
    >
      <h3 className="col-span-2 my-2 text-sm font-semibold">اطلاعات اصلی</h3>

      {/* فیلدهای متنی */}
      {textFields.map((field) => (
        <div key={field} className="relative w-full my-2">
          <input
            title="فیلدهای متنی "
            type="text"
            value={(form[field] as string) || ""}
            onChange={(e) => updateField(field, e.target.value as any)}
            className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
          />
          <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
            {fieldLabels[field]}
          </label>
        </div>
      ))}

      {/* فیلدهای عددی */}
      {numberFields.map((field) => (
        <div key={field} className="relative w-full my-2">
          <input
            title="فیلد های عدی"
            type="number"
            value={(form[field] as number) ?? ""}
            onChange={(e) =>
              updateField(field as keyof ProductForm, Number(e.target.value) as any)
            }
            className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
          />
          <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
            {fieldLabels[field]}
          </label>
        </div>
      ))}

      <div className="col-span-2 my-2 rounded-xl border border-white/30 bg-white/10 p-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">فعال‌سازی قیمت تخفیف</label>
          <button
            type="button"
            onClick={() => {
              const nextValue = !isDiscountEnabled;
              setIsDiscountEnabled(nextValue);
              if (!nextValue) {
                updateField("discountPrice", null as any);
              }
            }}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isDiscountEnabled ? "bg-green-500" : "bg-gray-500"
            }`}
            aria-pressed={isDiscountEnabled}
            title="فعال‌سازی قیمت تخفیف"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                isDiscountEnabled ? "right-0.5" : "right-5"
              }`}
            />
          </button>
        </div>

        {isDiscountEnabled ? (
          <div className="relative mt-4 w-full">
            <input
              title="قیمت تخفیف"
              type="number"
              value={form.discountPrice ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                updateField("discountPrice", (value === "" ? null : Number(value)) as any);
              }}
              className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
            />
            <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
              {fieldLabels.discountPrice}
            </label>
          </div>
        ) : null}
      </div>

      {/* textarea توضیحات */}
      <div className="relative w-full col-span-2 my-2">
        <textarea
          title="توضیحات"
          className="border-b border-gray-300 py-1 focus:border-b-2 focus:border-blue-700 transition-colors focus:outline-none peer bg-inherit w-full"
          rows={2}
          value={form.description}
          onChange={(e) => updateField("description", e.target.value as any)}
        />
        <label className="absolute -top-4 text-xs left-0 cursor-text peer-focus:text-xs peer-focus:-top-4 transition-all peer-focus:text-blue-700 peer-placeholder-shown:top-1 peer-placeholder-shown:text-sm">
          توضیحات
        </label>
      </div>
    </div>
  );
};

export default BasicInfoFields;

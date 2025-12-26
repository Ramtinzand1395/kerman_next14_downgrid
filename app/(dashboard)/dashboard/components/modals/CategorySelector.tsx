"use client";

import { Category, ProductForm } from "@/types";

 

interface CategorySelectorProps {
  form: ProductForm;
  categories: Category[];
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => void;
}

const CategorySelector = ({
  form,
  categories,
  updateField,
}: CategorySelectorProps) => {
  return (
    <div>
      <p className="font-medium mb-2">دسته بندی ها</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat._id}
            type="button"
            onClick={() => updateField("category", cat._id)}
            className={`px-2 py-1 rounded text-xs ${
              form.category === cat._id
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {cat.parent
              ? `مادر: ${cat.parent.name} - زیردسته: ${cat.name}`
              : cat.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;

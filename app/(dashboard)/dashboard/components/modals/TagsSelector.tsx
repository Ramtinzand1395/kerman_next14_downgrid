"use client";

import { ProductForm, Tag } from "@/types";

interface TagsSelectorProps {
  form: ProductForm;
  tagsList: Tag[];
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => void;
}
const TagsSelector = ({ updateField, form, tagsList }: TagsSelectorProps) => {
  return (
    <div>
      <div>
        <p className="font-medium mb-2">تگ‌ها</p>
        <div className="flex flex-wrap gap-2">
          {tagsList &&
            tagsList?.map((tag) => (
              <button
                key={tag._id}
                type="button"
                onClick={() => {
                  if (!form.tags.includes(tag._id)) {
                    updateField("tags", [...form.tags, tag._id]);
                  } else {
                    updateField(
                      "tags",
                      form.tags.filter((id) => id !== tag._id)
                    );
                  }
                }}
                className={`px-2 py-1 rounded text-xs ${
                  form.tags.includes(tag._id)
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {tag.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default TagsSelector;

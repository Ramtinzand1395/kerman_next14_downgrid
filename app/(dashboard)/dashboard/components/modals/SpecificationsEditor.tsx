"use client";

import { ProductForm } from "@/types";

 


interface SpecificationsEditorProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K]
  ) => void;
}
const SpecificationsEditor = ({
  form,
  updateField,
}: SpecificationsEditorProps) => {
  // ------------------ Specifications ------------------
  const updateSpecTitle = (index: number, value: string) => {
    const specs = [...form.specifications];
    specs[index].title = value;
    updateField("specifications", specs);
  };

  const updateSpecItem = (
    specIndex: number,
    itemIndex: number,
    field: "key" | "value",
    value: string
  ) => {
    const specs = [...form.specifications];
    specs[specIndex].items[itemIndex][field] = value;
    updateField("specifications", specs);
  };

  const addSpec = () => {
    updateField("specifications", [
      ...form.specifications,
      { title: "", items: [] },
    ]);
  };

  const addSpecItem = (specIndex: number) => {
    const specs = [...form.specifications];
    specs[specIndex].items.push({ key: "", value: "" });
    updateField("specifications", specs);
  };

  const removeSpecItem = (specIndex: number, itemIndex: number) => {
    const specs = [...form.specifications];
    specs[specIndex].items.splice(itemIndex, 1);
    updateField("specifications", specs);
  };

  const removeSpec = (specIndex: number) => {
    const specs = [...form.specifications];
    specs.splice(specIndex, 1);
    updateField("specifications", specs);
  };
  return (
    <div>
      <div>
        <p className="font-medium mb-2">مشخصات</p>
        {form.specifications.map((spec, sIndex) => (
          <div key={sIndex} className="border p-2 rounded mb-2">
            <div className="flex justify-between items-center mb-1">
              <input
                type="text"
                placeholder="عنوان مشخصات"
                className="p-1 border rounded flex-1"
                value={spec.title}
                onChange={(e) => updateSpecTitle(sIndex, e.target.value)}
              />
              <button
                onClick={() => removeSpec(sIndex)}
                className="bg-red-600 text-white rounded px-2 py-1 text-xs"
              >
                حذف
              </button>
            </div>
            {spec.items.map((item, iIndex) => (
              <div key={iIndex} className="flex gap-2 mb-1">
                <input
                  type="text"
                  placeholder="کلید"
                  className="p-1 border rounded flex-1"
                  value={item.key}
                  onChange={(e) =>
                    updateSpecItem(sIndex, iIndex, "key", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="مقدار"
                  className="p-1 border rounded flex-1"
                  value={item.value}
                  onChange={(e) =>
                    updateSpecItem(sIndex, iIndex, "value", e.target.value)
                  }
                />
                <button
                  onClick={() => removeSpecItem(sIndex, iIndex)}
                  className="bg-red-600 text-white rounded px-2 py-1 text-xs"
                >
                  حذف
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addSpecItem(sIndex)}
              className="bg-green-600 text-white rounded px-2 py-1 text-xs mt-1"
            >
              + آیتم
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSpec}
          className="bg-blue-600 text-white rounded px-4 py-2 mt-2"
        >
          + مشخصه جدید
        </button>
      </div>
    </div>
  );
};

export default SpecificationsEditor;

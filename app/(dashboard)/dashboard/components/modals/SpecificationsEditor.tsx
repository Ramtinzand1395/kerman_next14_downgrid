"use client";

import { Plus, PlusCircle, Trash2 } from "lucide-react";

import { ProductForm } from "@/types";

interface SpecificationsEditorProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const SpecificationsEditor = ({
  form,
  updateField,
}: SpecificationsEditorProps) => {
  const updateSpecTitle = (index: number, value: string) => {
    const specs = form.specifications.map((spec, specIndex) =>
      specIndex === index ? { ...spec, title: value } : spec,
    );

    updateField("specifications", specs);
  };

  const updateSpecItem = (
    specIndex: number,
    itemIndex: number,
    field: "key" | "value",
    value: string,
  ) => {
    const specs = form.specifications.map((spec, currentSpecIndex) => {
      if (currentSpecIndex !== specIndex) return spec;

      return {
        ...spec,
        items: spec.items.map((item, currentItemIndex) =>
          currentItemIndex === itemIndex ? { ...item, [field]: value } : item,
        ),
      };
    });

    updateField("specifications", specs);
  };

  const addSpec = () => {
    updateField("specifications", [
      ...form.specifications,
      { title: "", items: [{ key: "", value: "" }] },
    ]);
  };

  const addSpecItem = (specIndex: number) => {
    const specs = form.specifications.map((spec, currentSpecIndex) =>
      currentSpecIndex === specIndex
        ? {
            ...spec,
            items: [...spec.items, { key: "", value: "" }],
          }
        : spec,
    );

    updateField("specifications", specs);
  };

  const removeSpecItem = (specIndex: number, itemIndex: number) => {
    const specs = form.specifications.map((spec, currentSpecIndex) =>
      currentSpecIndex === specIndex
        ? {
            ...spec,
            items: spec.items.filter(
              (_, currentItemIndex) => currentItemIndex !== itemIndex,
            ),
          }
        : spec,
    );

    updateField("specifications", specs);
  };

  const removeSpec = (specIndex: number) => {
    const specs = form.specifications.filter((_, index) => index !== specIndex);
    updateField("specifications", specs);
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 p-4 shadow-lg backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">مشخصات فنی</p>
        <span className="rounded-full bg-white/20 px-2 py-1 text-xs">
          {form.specifications.length} گروه
        </span>
      </div>

      <div className="space-y-3">
        {form.specifications.map((spec, sIndex) => (
          <div
            key={sIndex}
            className="rounded-xl border border-white/30 bg-white/10 p-3"
          >
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="مثلاً: مشخصات نمایشگر"
                className="w-full rounded-lg border border-white/40 bg-white/10 p-2 text-sm outline-none placeholder:text-white/70 focus:border-blue-300"
                value={spec.title}
                onChange={(e) => updateSpecTitle(sIndex, e.target.value)}
              />
              <button
                title="remove"
                type="button"
                onClick={() => removeSpec(sIndex)}
                className="rounded-lg bg-red-500/90 p-2 text-white transition hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {spec.items.map((item, iIndex) => (
                <div
                  key={iIndex}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                >
                  <input
                    type="text"
                    placeholder="کلید (مثلاً: اندازه)"
                    className="rounded-lg border border-white/40 bg-white/10 p-2 text-sm outline-none placeholder:text-white/70 focus:border-blue-300"
                    value={item.key}
                    onChange={(e) =>
                      updateSpecItem(sIndex, iIndex, "key", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="مقدار (مثلاً: ۶.۷ اینچ)"
                    className="rounded-lg border border-white/40 bg-white/10 p-2 text-sm outline-none placeholder:text-white/70 focus:border-blue-300"
                    value={item.value}
                    onChange={(e) =>
                      updateSpecItem(sIndex, iIndex, "value", e.target.value)
                    }
                  />
                  <button
                    title="remove"
                    type="button"
                    onClick={() => removeSpecItem(sIndex, iIndex)}
                    className="rounded-lg bg-red-500/90 p-2 text-white transition hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addSpecItem(sIndex)}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-emerald-500/90 px-3 py-2 text-xs font-medium text-white transition hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              افزودن آیتم
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSpec}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <PlusCircle className="h-4 w-4" />
        افزودن گروه مشخصات
      </button>
    </div>
  );
};

export default SpecificationsEditor;

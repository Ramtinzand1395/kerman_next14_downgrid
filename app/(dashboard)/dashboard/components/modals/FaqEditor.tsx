"use client";

import { PlusCircle, Trash2 } from "lucide-react";

import { ProductForm } from "@/types";

interface FaqEditorProps {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => void;
}

const FaqEditor = ({ form, updateField }: FaqEditorProps) => {
  const updateFaq = (
    index: number,
    field: "question" | "answer",
    value: string,
  ) => {
    const faqs = form.faqs.map((faq, faqIndex) =>
      faqIndex === index ? { ...faq, [field]: value } : faq,
    );

    updateField("faqs", faqs);
  };

  const addFaq = () => {
    updateField("faqs", [...form.faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    const faqs = form.faqs.filter((_, faqIndex) => faqIndex !== index);
    updateField("faqs", faqs);
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 p-4 shadow-lg backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">سوالات پرتکرار</p>
        <span className="rounded-full bg-white/20 px-2 py-1 text-xs">
          {form.faqs.length} سوال
        </span>
      </div>

      <div className="space-y-3">
        {form.faqs.map((faq, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/30 bg-white/10 p-3"
          >
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                placeholder="مثلاً: آیا این محصول گارانتی دارد؟"
                className="w-full rounded-lg border border-white/40 bg-white/10 p-2 text-sm outline-none placeholder:text-white/70 focus:border-blue-300"
                value={faq.question}
                onChange={(e) => updateFaq(index, "question", e.target.value)}
              />
              <button
                title="remove"
                type="button"
                onClick={() => removeFaq(index)}
                className="rounded-lg bg-red-500/90 p-2 text-white transition hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <textarea
              rows={3}
              placeholder="پاسخ سوال را اینجا بنویسید..."
              className="w-full rounded-lg border border-white/40 bg-white/10 p-2 text-sm outline-none placeholder:text-white/70 focus:border-blue-300"
              value={faq.answer}
              onChange={(e) => updateFaq(index, "answer", e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addFaq}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <PlusCircle className="h-4 w-4" />
        افزودن سوال
      </button>
    </div>
  );
};

export default FaqEditor;

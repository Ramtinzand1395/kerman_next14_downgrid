"use client";

import { ProductForm } from "@/types";

interface Props {
  form: ProductForm;
  updateField: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
}

export default function FaqEditor({ form, updateField }: Props) {
  const faq = form.faq || [];

  const updateFaqItem = (index: number, key: "question" | "answer", value: string) => {
    const updated = [...faq];
    updated[index] = { ...updated[index], [key]: value };
    updateField("faq", updated as ProductForm["faq"]);
  };

  return (
    <div className="space-y-3">
      {faq.map((item, index) => (
        <div key={index} className="rounded-lg border border-slate-600 p-3">
          <input
            type="text"
            value={item.question}
            onChange={(e) => updateFaqItem(index, "question", e.target.value)}
            placeholder="سوال متداول"
            className="mb-2 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
          />
          <textarea
            value={item.answer}
            onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
            placeholder="پاسخ سوال"
            rows={3}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => updateField("faq", [...faq, { question: "", answer: "" }] as ProductForm["faq"])}
        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold"
      >
        افزودن سوال جدید
      </button>
    </div>
  );
}

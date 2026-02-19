"use client";

import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: RichTextEditorProps) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs">{label}</label>
      <div className="rounded-lg bg-white text-slate-900">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

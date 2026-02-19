"use client";

import { useRef } from "react";

type Command = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

const buttons: { label: string; command: Command }[] = [
  { label: "B", command: "bold" },
  { label: "I", command: "italic" },
  { label: "U", command: "underline" },
  { label: "• لیست", command: "insertUnorderedList" },
  { label: "1. لیست", command: "insertOrderedList" },
];

export default function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (command: Command) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    onChange(editorRef.current?.innerHTML || "");
  };

  return (
    <div>
      <label className="mb-2 block text-xs">{label}</label>

      <div className="mb-2 flex flex-wrap gap-2 rounded-md border border-slate-300 bg-white p-2">
        {buttons.map((btn) => (
          <button
            key={btn.command}
            type="button"
            onClick={() => exec(btn.command)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        dangerouslySetInnerHTML={{ __html: value || "" }}
        className="min-h-[220px] rounded-md border border-slate-300 bg-white p-3 text-black focus:border-blue-700 focus:outline-none"
      />
    </div>
  );
}

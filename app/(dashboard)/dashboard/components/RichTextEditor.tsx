"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, type MouseEvent, type Ref } from "react";
import type ReactQuill from "react-quill";
import type { Quill } from "quill";
import "react-quill/dist/quill.snow.css";

const QuillEditor = dynamic(
  async () => {
    const { default: Editor } = await import("react-quill");
    return function LoadedEditor({
      editorRef,
      ...props
    }: ReactQuill.ReactQuillProps & { editorRef: Ref<ReactQuill> }) {
      return <Editor {...props} ref={editorRef} />;
    };
  },
  { ssr: false },
);

const formats = [
  "header", "bold", "italic", "underline", "strike", "list", "bullet",
  "blockquote", "code-block", "link", "image",
];

const articleFormats = [
  ...formats, "alt", "width", "height", "code", "direction", "align", "indent",
];

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  imageUpload?: (file: File) => Promise<string>;
  article?: boolean;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  imageUpload,
  article = false,
}: RichTextEditorProps) {
  const editorRef = useRef<ReactQuill>(null);
  const uploading = useRef(false);
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, 4, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          article ? ["blockquote", "code", "code-block"] : ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: function (this: { quill: Quill }) {
            if (uploading.current) return;
            const editor = this.quill;
            const selection = editor.getSelection(true);
            const insertionIndex = () => {
              const lastIndex = editor.getLength() - 1;
              return Math.min(selection?.index ?? lastIndex, lastIndex);
            };
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file || uploading.current) return;

              if (!imageUpload) {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result !== "string" || !editor.root.isConnected) return;
                  const index = insertionIndex();
                  editor.insertEmbed(index, "image", reader.result, "user");
                  editor.setSelection(index + 1, 0);
                };
                reader.readAsDataURL(file);
                return;
              }

              uploading.current = true;
              try {
                const alt = window.prompt("متن جایگزین تصویر را کوتاه و توصیفی بنویسید:", "");
                if (alt === null) return;
                const url = await imageUpload(file);
                if (!editor.root.isConnected) return;
                const index = insertionIndex();
                const Delta = (editor.constructor as typeof Quill).import("delta");
                editor.updateContents(
                  new Delta().retain(index).insert({ image: url }, { alt: alt.trim() }),
                  "user",
                );
                editor.setSelection(index + 1, 0);
              } catch (error) {
                window.alert(error instanceof Error ? error.message : "آپلود تصویر ناموفق بود");
              } finally {
                uploading.current = false;
              }
            };
            input.click();
          },
        },
      },
    }),
    [article, imageUpload],
  );

  const editImageAlt = (event: MouseEvent<HTMLDivElement>) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.closest(".ql-editor")) return;
    const editor = editorRef.current?.getEditor();
    if (!editor?.root.contains(image)) return;
    const blot = (editor.constructor as typeof Quill).find(image);
    if (!blot) return;
    const alt = window.prompt("متن جایگزین این تصویر", image.getAttribute("alt") || "");
    if (alt === null) return;
    editor.formatText(editor.getIndex(blot), 1, "alt", alt.trim() || false, "user");
  };

  return (
    <div className={className} dir={article ? "rtl" : undefined}>
      <label className="mb-2 block text-xs">{label}</label>
      <div
        className="rounded-lg bg-white text-slate-900"
        onDoubleClick={article ? editImageAlt : undefined}
      >
        <QuillEditor
          editorRef={editorRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={article ? articleFormats : formats}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
const QuillEditor = ReactQuill as any;

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  imageUpload?: (file: File) => Promise<string>;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  className = "",
  imageUpload,
}: RichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, 4, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "code-block"],
          ["link", "image"],
          ["clean"],
        ],
        handlers: {
          image: function (this: any) {
            const input = document.createElement("input");
            input.setAttribute("type", "file");
            input.setAttribute("accept", "image/*");
            input.click();

            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              const insertImage = (source: string) => {
                const editor = this.quill;
                if (!editor) return;

                const range = editor.getSelection(true);
                const cursorPosition = range?.index ?? editor.getLength();
                editor.insertEmbed(cursorPosition, "image", source);
                editor.setSelection(cursorPosition + 1);

                if (imageUpload) {
                  const alt = window.prompt(
                    "متن جایگزین تصویر را کوتاه و توصیفی بنویسید:",
                    "",
                  );
                  const imageNode = editor.root.querySelectorAll("img")[cursorPosition]
                    || editor.root.querySelectorAll("img")[
                      editor.root.querySelectorAll("img").length - 1
                    ];
                  if (imageNode && alt?.trim()) {
                    imageNode.setAttribute("alt", alt.trim());
                    editor.update("user");
                  }
                }
              };

              if (imageUpload) {
                try {
                  insertImage(await imageUpload(file));
                } catch (error) {
                  window.alert(
                    error instanceof Error ? error.message : "آپلود تصویر ناموفق بود",
                  );
                }
                return;
              }

              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") insertImage(reader.result);
              };

              reader.readAsDataURL(file);
            };
          },
        },
      },
    }),
    [imageUpload],
  );

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "bullet",
    "blockquote",
    "code-block",
    "link",
    "image",
  ];

  return (
    <div className={className}>
      <label className="mb-2 block text-xs">{label}</label>
      <div className="rounded-lg bg-white text-slate-900">
        <QuillEditor
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

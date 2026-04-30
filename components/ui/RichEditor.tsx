"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import "react-quill-new/dist/quill.snow.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill-new") as any, { ssr: false }) as any;

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichEditor({ value, onChange, placeholder, height = 300 }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Quill 인스턴스에 이미지 핸들러 등록
  useEffect(() => {
    if (!mounted || !quillRef.current) return;
    const editor = quillRef.current.getEditor?.() || quillRef.current.editor;
    if (!editor) return;

    const toolbar = editor.getModule("toolbar");
    if (toolbar) {
      toolbar.addHandler("image", () => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", "image/*");
        input.click();
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const fd = new FormData();
          fd.append("file", file);
          fd.append("category", "editor");
          try {
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.url) {
              const range = editor.getSelection(true);
              editor.insertEmbed(range?.index || 0, "image", data.url);
              editor.setSelection((range?.index || 0) + 1);
            } else {
              alert(data.error || "업로드 실패");
            }
          } catch {
            alert("이미지 업로드 중 오류가 발생했습니다.");
          }
        };
      });
    }
  }, [mounted]);

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      [{ font: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote"],
      ["link", "image"],
      ["clean"],
    ],
  };

  const formats = [
    "header", "font", "size",
    "bold", "italic", "underline", "strike",
    "color", "background",
    "align",
    "list",
    "blockquote",
    "link", "image",
  ];

  if (!mounted) return <div style={{ minHeight: height + 42, background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" }} />;

  return (
    <div>
      <style>{`
        .ql-editor { min-height: ${height}px; font-size: 14px; }
        .ql-toolbar.ql-snow { border-radius: 6px 6px 0 0; }
        .ql-container.ql-snow { border-radius: 0 0 6px 6px; }
        .ql-editor img { max-width: 100%; height: auto; }
      `}</style>
      <ReactQuill
        ref={(el: unknown) => { quillRef.current = el; }}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "내용을 입력하세요..."}
      />
    </div>
  );
}

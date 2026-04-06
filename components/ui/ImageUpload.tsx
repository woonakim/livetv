"use client";

import { useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (url: string) => void;
  category: string;
  label?: string;
  width?: number;
  height?: number;
}

export default function ImageUpload({ value, onChange, category, label = "이미지", width = 120, height = 80 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        onChange(data.url);
      } else {
        alert(data.error || "업로드 실패");
      }
    } catch {
      alert("네트워크 오류");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && <label className="text-[11px] text-gray-500 block mb-1">{label}</label>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative rounded-lg overflow-hidden flex items-center justify-center cursor-pointer group border-2 border-dashed"
          style={{ width, height, borderColor: "var(--border)", background: "var(--bg)" }}
        >
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg">📷</span>
              <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>클릭하여 업로드</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full animate-spin border-2 border-white/30 border-t-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">{value ? "변경" : "업로드"}</span>
          </div>
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="URL 직접 입력 또는 이미지 클릭"
            className="w-full h-8 px-2 border border-gray-300 rounded text-[12px]"
          />
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-[10px] text-red-500 mt-1 hover:underline">삭제</button>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
    </div>
  );
}

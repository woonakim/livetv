"use client";

import { useRef, useState } from "react";

interface Props {
  currentAvatar: string;
  profileId?: number;
  onUploaded: (newPath: string) => void;
}

export default function AvatarUpload({ currentAvatar, profileId, onUploaded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentAvatar);

  const handleUpload = async (file: File) => {
    if (uploading) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (profileId) formData.append("profileId", String(profileId));

    try {
      const res = await fetch("/api/picksters/avatar", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setPreview(data.avatar);
        onUploaded(data.avatar);
      } else {
        alert(data.error || "업로드 실패");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      alert("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const isImage = preview && !preview.startsWith("/") ? false : true;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center cursor-pointer group"
        style={{ background: "var(--surface-alt, #f1f5f9)", border: "2px solid var(--border)" }}
      >
        {isImage && preview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={`${preview}?v=${Date.now()}`} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">{preview || "👤"}</span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">변경</span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
          </div>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>클릭하여 변경</span>
    </div>
  );
}

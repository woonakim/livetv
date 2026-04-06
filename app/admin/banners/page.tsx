"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface Banner {
  id: number;
  name: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  sort: number;
  isActive: boolean;
}

const POSITIONS = [
  { id: "left_top", label: "분석 사이드바 상단" },
  { id: "left_bottom", label: "분석 사이드바 하단" },
  { id: "right_top", label: "채팅 사이드바 상단" },
  { id: "right_bottom", label: "채팅 사이드바 하단" },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchBanners = () => {
    fetch("/api/admin/banners").then(r => r.json()).then(d => setBanners(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBanners(); }, []);

  const addBanner = async () => {
    const res = await fetch("/api/admin/banners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "새 배너", position: "left_top" }),
    });
    if (res.ok) fetchBanners();
  };

  const updateBanner = async (banner: Banner) => {
    await fetch(`/api/admin/banners/${banner.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(banner),
    });
    setMsg("저장됨"); setTimeout(() => setMsg(""), 2000);
  };

  const deleteBanner = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    fetchBanners();
  };

  const update = (id: number, field: string, value: unknown) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>배너 관리</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>사이드바에 표시되는 배너를 관리합니다 · 권장 사이즈: <b>350 x 60 px</b></p>
        </div>
        <button onClick={addBanner} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--brand)" }}>+ 배너 추가</button>
      </div>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {banners.length === 0 ? (
        <div className="py-12 text-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          등록된 배너가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-4">
                {/* 이미지 미리보기 */}
                <div className="shrink-0">
                  <ImageUpload value={b.imageUrl} onChange={v => { update(b.id, "imageUrl", v); }} category="banners" label="배너 이미지" width={200} height={80} />
                </div>

                {/* 설정 */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>배너 이름</label>
                      <input value={b.name} onChange={e => update(b.id, "name", e.target.value)} className="w-full h-7 px-2 text-[13px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="w-32">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>위치</label>
                      <select value={b.position} onChange={e => update(b.id, "position", e.target.value)} className="w-full h-7 px-1 text-[12px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                        {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>순서</label>
                      <input type="number" value={b.sort} onChange={e => update(b.id, "sort", parseInt(e.target.value) || 0)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>링크 URL</label>
                    <input value={b.linkUrl} onChange={e => update(b.id, "linkUrl", e.target.value)} placeholder="https://..." className="w-full h-7 px-2 text-[12px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={b.isActive} onChange={e => update(b.id, "isActive", e.target.checked)} />
                      <span className="text-[12px] font-bold" style={{ color: b.isActive ? "var(--brand)" : "var(--text-secondary)" }}>{b.isActive ? "활성" : "비활성"}</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => updateBanner(b)} className="text-[11px] font-bold px-3 py-1 rounded text-white" style={{ background: "var(--brand)" }}>저장</button>
                      <button onClick={() => deleteBanner(b.id)} className="text-[11px] font-bold px-3 py-1 rounded text-red-500" style={{ border: "1px solid #fca5a5" }}>삭제</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

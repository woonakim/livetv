"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface PopupItem {
  id: number;
  name: string;
  imageUrl: string;
  linkUrl: string;
  width: number;
  height: number;
  posX: number;
  posY: number;
  hideToday: boolean;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  sort: number;
}

export default function AdminPopupsPage() {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchPopups = () => {
    fetch("/api/admin/popups").then(r => r.json()).then(d => setPopups(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPopups(); }, []);

  const addPopup = async () => {
    const res = await fetch("/api/admin/popups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "새 팝업" }),
    });
    if (res.ok) fetchPopups();
  };

  const updatePopup = async (popup: PopupItem) => {
    await fetch(`/api/admin/popups/${popup.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(popup),
    });
    setMsg("저장됨"); setTimeout(() => setMsg(""), 2000);
  };

  const deletePopup = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/popups/${id}`, { method: "DELETE" });
    fetchPopups();
  };

  const update = (id: number, field: string, value: unknown) => {
    setPopups(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>팝업 관리</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>메인 페이지에 표시되는 팝업을 관리합니다</p>
        </div>
        <button onClick={addPopup} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--brand)" }}>+ 팝업 추가</button>
      </div>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {popups.length === 0 ? (
        <div className="py-12 text-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          등록된 팝업이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {popups.map(p => (
            <div key={p.id} className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start gap-4">
                {/* 이미지 미리보기 */}
                <div className="shrink-0">
                  <ImageUpload value={p.imageUrl} onChange={v => update(p.id, "imageUrl", v)} category="popups" label="팝업 이미지" width={150} height={200} />
                  <p className="text-[9px] text-center mt-1" style={{ color: "var(--text-secondary)" }}>권장 1150x930px</p>
                </div>

                {/* 설정 */}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>팝업 이름</label>
                      <input value={p.name} onChange={e => update(p.id, "name", e.target.value)} className="w-full h-7 px-2 text-[13px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="w-16">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>순서</label>
                      <input type="number" value={p.sort} onChange={e => update(p.id, "sort", parseInt(e.target.value) || 0)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>링크 URL</label>
                    <input value={p.linkUrl} onChange={e => update(p.id, "linkUrl", e.target.value)} placeholder="https://..." className="w-full h-7 px-2 text-[12px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  </div>

                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>너비(px)</label>
                      <input type="number" value={p.width} onChange={e => update(p.id, "width", parseInt(e.target.value) || 400)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>높이(px)</label>
                      <input type="number" value={p.height} onChange={e => update(p.id, "height", parseInt(e.target.value) || 500)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>X 위치</label>
                      <input type="number" value={p.posX} onChange={e => update(p.id, "posX", parseInt(e.target.value) || 0)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="w-20">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>Y 위치</label>
                      <input type="number" value={p.posY} onChange={e => update(p.id, "posY", parseInt(e.target.value) || 0)} className="w-full h-7 px-2 text-[13px] rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>시작일</label>
                      <input type="date" value={p.startDate?.slice(0, 10) || ""} onChange={e => update(p.id, "startDate", e.target.value || null)} className="w-full h-7 px-2 text-[12px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold block mb-0.5" style={{ color: "var(--text-secondary)" }}>종료일</label>
                      <input type="date" value={p.endDate?.slice(0, 10) || ""} onChange={e => update(p.id, "endDate", e.target.value || null)} className="w-full h-7 px-2 text-[12px] rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={p.isActive} onChange={e => update(p.id, "isActive", e.target.checked)} />
                        <span className="text-[12px] font-bold" style={{ color: p.isActive ? "var(--brand)" : "var(--text-secondary)" }}>{p.isActive ? "활성" : "비활성"}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={p.hideToday} onChange={e => update(p.id, "hideToday", e.target.checked)} />
                        <span className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>오늘 하루 안보기</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updatePopup(p)} className="text-[11px] font-bold px-3 py-1 rounded text-white" style={{ background: "var(--brand)" }}>저장</button>
                      <button onClick={() => deletePopup(p.id)} className="text-[11px] font-bold px-3 py-1 rounded text-red-500" style={{ border: "1px solid #fca5a5" }}>삭제</button>
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

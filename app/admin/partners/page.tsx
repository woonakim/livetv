"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface Partner {
  id: number; name: string; category: string; badge: string; desc: string; content: string;
  img: string; thumb: string; contact: string; site: string; sortOrder: number;
  isActive: boolean; likes: number; views: number; createdAt: string;
}

const CONTENT_TEMPLATE = `## 업체 소개

업체에 대한 소개를 작성해주세요.

## 제공 서비스

- **서비스 1**: 설명
- **서비스 2**: 설명

## 가입 혜택

- **혜택 1**: 설명
- **혜택 2**: 설명`;

const empty = (): Partial<Partner> => ({ name: "", category: "공식제휴", badge: "공식제휴", desc: "", content: CONTENT_TEMPLATE, img: "/business.png", thumb: "", contact: "1234", site: "#", sortOrder: 0 });

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editing, setEditing] = useState<Partial<Partner> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/partners").then(r => r.json()).then(setPartners);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const handleSave = async () => {
    if (!editing?.name) return;
    if (editId) {
      await fetch(`/api/admin/partners/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("수정되었습니다.");
    } else {
      await fetch("/api/admin/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("등록되었습니다.");
    }
    setEditing(null); setEditId(null); load();
  };

  const handleToggle = async (p: Partner) => {
    await fetch(`/api/admin/partners/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
    flash("삭제되었습니다."); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">제휴업체 관리 <span className="text-sm font-normal text-gray-400 ml-1">{partners.length}개</span></h1>
        <button onClick={() => { setEditing(empty()); setEditId(null); }} className="h-8 px-4 bg-gray-800 text-white text-[12px] font-bold rounded">새 업체 등록</button>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {/* 등록/수정 폼 */}
      {editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? "업체 수정" : "새 업체 등록"}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[13px]">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">업체명 *</label>
              <input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">카테고리</label>
              <input value={editing.category || ""} onChange={e => setEditing({ ...editing, category: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">배지</label>
              <input value={editing.badge || ""} onChange={e => setEditing({ ...editing, badge: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">가입코드</label>
              <input value={editing.contact || ""} onChange={e => setEditing({ ...editing, contact: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">사이트 URL</label>
              <input value={editing.site || ""} onChange={e => setEditing({ ...editing, site: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">정렬 순서</label>
              <input type="number" value={editing.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div className="lg:col-span-2">
              <ImageUpload value={editing.img || ""} onChange={v => setEditing({ ...editing, img: v })} category="partners" label="배너 이미지 (상세페이지 상단)" width={200} height={100} />
            </div>
            <div>
              <ImageUpload value={editing.thumb || ""} onChange={v => setEditing({ ...editing, thumb: v })} category="partners" label="썸네일 (목록용)" width={100} height={100} />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[11px] text-gray-500 block mb-1">한줄 설명</label>
              <input value={editing.desc || ""} onChange={e => setEditing({ ...editing, desc: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" />
            </div>
            <div className="lg:col-span-3">
              <label className="text-[11px] text-gray-500 block mb-1">본문 내용 (마크다운)</label>
              <textarea value={editing.content || ""} onChange={e => setEditing({ ...editing, content: e.target.value })} rows={10} className="w-full px-2 py-1 border border-gray-300 rounded text-[13px] font-mono resize-none" placeholder="## 제목&#10;- **내용**" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="h-8 px-4 bg-blue-600 text-white text-[12px] font-bold rounded">저장</button>
            <button onClick={() => { setEditing(null); setEditId(null); }} className="h-8 px-4 bg-gray-100 text-gray-600 text-[12px] font-bold rounded">취소</button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">업체명</th>
              <th className="px-3 py-2.5 text-center font-semibold">배지</th>
              <th className="px-3 py-2.5 text-center font-semibold">가입코드</th>
              <th className="px-3 py-2.5 text-right font-semibold">조회</th>
              <th className="px-3 py-2.5 text-right font-semibold">좋아요</th>
              <th className="px-3 py-2.5 text-center font-semibold">순서</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.id}</td>
                <td className="px-3 py-2 font-semibold"><button onClick={() => { setEditing({ name: p.name, category: p.category, badge: p.badge, desc: p.desc, content: p.content, img: p.img, thumb: p.thumb, contact: p.contact, site: p.site, sortOrder: p.sortOrder }); setEditId(p.id); }} className="text-blue-600 hover:underline text-left">{p.name}</button></td>
                <td className="px-3 py-2 text-center"><span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{p.badge}</span></td>
                <td className="px-3 py-2 text-center font-mono text-gray-600">{p.contact}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.views}</td>
                <td className="px-3 py-2 text-right text-gray-500">{p.likes}</td>
                <td className="px-3 py-2 text-center text-gray-500">{p.sortOrder}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleToggle(p)} className={`text-[11px] font-bold ${p.isActive ? "text-green-600" : "text-gray-400"}`}>
                    {p.isActive ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { setEditing({ name: p.name, category: p.category, badge: p.badge, desc: p.desc, content: p.content, img: p.img, thumb: p.thumb, contact: p.contact, site: p.site, sortOrder: p.sortOrder }); setEditId(p.id); }} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(p.id)} className="text-[12px] font-bold text-red-500 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

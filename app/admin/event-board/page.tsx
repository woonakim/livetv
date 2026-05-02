"use client";

import { useEffect, useState, useCallback } from "react";
import RichEditor from "@/components/ui/RichEditor";

interface Post {
  id: number; title: string; content: string; author: string;
  isPinned: boolean; viewCount: number; isActive: boolean; createdAt: string;
}

export default function AdminEventBoardPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/event-board").then(r => r.json()).then(setPosts); }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const handleSave = async () => {
    if (!editing?.title) return;
    if (editId) {
      await fetch(`/api/admin/event-board/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("수정되었습니다.");
    } else {
      await fetch("/api/admin/event-board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("등록되었습니다.");
    }
    setEditing(null); setEditId(null); load();
  };

  const handleTogglePin = async (p: Post) => {
    await fetch(`/api/admin/event-board/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPinned: !p.isPinned }) });
    load();
  };

  const handleToggleActive = async (p: Post) => {
    await fetch(`/api/admin/event-board/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !p.isActive }) });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/admin/event-board/${id}`, { method: "DELETE" });
    flash("삭제되었습니다."); load();
  };

  const handleEditViewCount = async (p: Post) => {
    const v = prompt(`조회수를 입력하세요 (현재: ${p.viewCount})`, String(p.viewCount));
    if (v === null) return;
    const next = Math.max(0, parseInt(v) || 0);
    await fetch(`/api/admin/event-board/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewCount: next }) });
    flash("조회수가 수정되었습니다."); load();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">이벤트 게시판 관리 <span className="text-sm font-normal text-gray-400 ml-1">{posts.length}개</span></h1>
        <button onClick={() => { setEditing({ title: "", content: "", author: "라이브TV", isPinned: false }); setEditId(null); }} className="h-8 px-4 bg-gray-800 text-white text-[12px] font-bold rounded">새 글 등록</button>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? "글 수정" : "새 글 등록"}</h2>
          <div className="space-y-3 text-[13px]">
            <div><label className="text-[11px] text-gray-500 block mb-1">제목 *</label><input value={(editing.title as string) || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">내용 *</label><RichEditor value={(editing.content as string) || ""} onChange={v => setEditing({ ...editing, content: v })} /></div>
            <div className="flex gap-4">
              <div><label className="text-[11px] text-gray-500 block mb-1">작성자</label><input value={(editing.author as string) || ""} onChange={e => setEditing({ ...editing, author: e.target.value })} className="w-40 h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
              <label className="flex items-center gap-2 self-end h-8 text-[13px]"><input type="checkbox" checked={!!editing.isPinned} onChange={e => setEditing({ ...editing, isPinned: e.target.checked })} /> 상단 고정</label>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="h-8 px-4 bg-blue-600 text-white text-[12px] font-bold rounded">저장</button>
            <button onClick={() => { setEditing(null); setEditId(null); }} className="h-8 px-4 bg-gray-100 text-gray-600 text-[12px] font-bold rounded">취소</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">제목</th>
              <th className="px-3 py-2.5 text-center font-semibold">작성자</th>
              <th className="px-3 py-2.5 text-center font-semibold">고정</th>
              <th className="px-3 py-2.5 text-right font-semibold">조회</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-center font-semibold">작성일</th>
              <th className="px-3 py-2.5 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{p.id}</td>
                <td className="px-3 py-2 font-semibold max-w-[250px] truncate"><button onClick={() => { setEditing({ title: p.title, content: p.content, author: p.author, isPinned: p.isPinned }); setEditId(p.id); }} className="text-blue-600 hover:underline text-left">{p.title}</button></td>
                <td className="px-3 py-2 text-center text-gray-600">{p.author}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleTogglePin(p)} className={`text-[11px] font-bold ${p.isPinned ? "text-amber-600" : "text-gray-400"}`}>{p.isPinned ? "고정" : "-"}</button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleEditViewCount(p)} className="text-gray-600 hover:text-blue-600 hover:underline" title="클릭하여 조회수 수정">{p.viewCount.toLocaleString()}</button>
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleToggleActive(p)} className={`text-[11px] font-bold ${p.isActive ? "text-green-600" : "text-gray-400"}`}>{p.isActive ? "활성" : "비활성"}</button>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{formatDate(p.createdAt)}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => { setEditing({ title: p.title, content: p.content, author: p.author, isPinned: p.isPinned }); setEditId(p.id); }} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
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

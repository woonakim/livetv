"use client";

import { useEffect, useState, useCallback } from "react";

interface ChatMsg { id: number; nickname: string; role: string; text: string; userId: number | null; createdAt: string; }

const ROLE_LABEL: Record<string, string> = { USER: "일반", PICKSTER: "픽스터", BJ: "BJ", ADMIN: "관리자", SUPERADMIN: "최고관리자" };

export default function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    fetch(`/api/admin/chat?${params}`).then(r => r.json()).then(d => {
      setMessages(d.messages || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    });
  }, [page, search]);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const handleDelete = async (id: number) => {
    await fetch("/api/admin/chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    flash("삭제되었습니다."); load();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${selected.size}개 메시지를 삭제하시겠습니까?`)) return;
    await fetch("/api/admin/chat", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: Array.from(selected) }) });
    setSelected(new Set());
    flash(`${selected.size}개 삭제되었습니다.`); load();
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">채팅 관리 <span className="text-sm font-normal text-gray-400 ml-1">총 {total}건</span></h1>
        {selected.size > 0 && (
          <button onClick={handleBulkDelete} className="h-8 px-4 bg-red-500 text-white text-[12px] font-bold rounded">{selected.size}개 선택 삭제</button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="닉네임 또는 메시지 검색" className="h-8 px-3 text-[13px] border border-gray-300 rounded w-60 focus:outline-none" />
          <button type="submit" className="h-8 px-3 bg-gray-800 text-white text-[12px] font-bold rounded">검색</button>
        </form>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-2 py-2.5 w-8"><input type="checkbox" onChange={e => { if (e.target.checked) setSelected(new Set(messages.map(m => m.id))); else setSelected(new Set()); }} /></th>
              <th className="px-3 py-2.5 text-left font-semibold">닉네임</th>
              <th className="px-3 py-2.5 text-center font-semibold w-16">등급</th>
              <th className="px-3 py-2.5 text-left font-semibold">메시지</th>
              <th className="px-3 py-2.5 text-center font-semibold w-32">시간</th>
              <th className="px-3 py-2.5 text-center font-semibold w-16">관리</th>
            </tr>
          </thead>
          <tbody>
            {messages.map(m => (
              <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-2 text-center"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} /></td>
                <td className="px-3 py-2 font-semibold">{m.userId ? <a href={`/admin/users/${m.userId}`} className="text-blue-600 hover:underline">{m.nickname}</a> : m.nickname}</td>
                <td className="px-3 py-2 text-center text-[11px] text-gray-500">{ROLE_LABEL[m.role] || m.role}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[300px] truncate">{m.text}</td>
                <td className="px-3 py-2 text-center text-gray-500 text-[11px]">{formatDate(m.createdAt)}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleDelete(m.id)} className="text-[11px] font-bold text-red-500 hover:underline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-[12px] bg-white border border-gray-300 rounded disabled:opacity-40">이전</button>
          <span className="px-3 py-1.5 text-[12px] text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-[12px] bg-white border border-gray-300 rounded disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}

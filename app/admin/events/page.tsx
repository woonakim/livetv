"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/components/ui/ImageUpload";
import RichEditor from "@/components/ui/RichEditor";

interface EventItem {
  id: number; title: string; content: string; teamA: string; teamB: string; betType: string;
  reward: string; deadline: string; bannerImg: string; bottomImg: string;
  isActive: boolean; viewCount: number; createdAt: string;
  winnerSide: string | null; settledAt: string | null;
  _count: { votes: number };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/events").then(r => r.json()).then(setEvents); }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const newEvent = () => {
    const dl = new Date(); dl.setDate(dl.getDate() + 3);
    setEditing({ title: "", teamA: "", teamB: "", betType: "승패", reward: "10,000원 포인트", deadline: dl.toISOString().slice(0, 16), content: "" });
    setEditId(null);
  };

  const handleSave = async () => {
    if (!editing?.title || !editing?.teamA || !editing?.teamB) return;
    if (editId) {
      await fetch(`/api/admin/events/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("수정되었습니다.");
    } else {
      await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      flash("등록되었습니다.");
    }
    setEditing(null); setEditId(null); load();
  };

  const handleToggle = async (ev: EventItem) => {
    await fetch(`/api/admin/events/${ev.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !ev.isActive }) });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까? 투표 데이터도 함께 삭제됩니다.")) return;
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    flash("삭제되었습니다."); load();
  };

  const handleSettle = async (ev: EventItem) => {
    const ans = prompt(`정산 결과를 입력하세요.\nA = ${ev.teamA} 승\nB = ${ev.teamB} 승\nDRAW = 무승부 (모두 무효)`, "A");
    if (!ans) return;
    const winnerSide = ans.trim().toUpperCase();
    if (!["A", "B", "DRAW"].includes(winnerSide)) { alert("A/B/DRAW 중 입력해주세요."); return; }
    if (!confirm(`이벤트 "${ev.title}"을 ${winnerSide}로 정산합니다. 정답자에게 보상 + 연승 갱신이 즉시 처리됩니다. 진행할까요?`)) return;
    const res = await fetch(`/api/admin/events/${ev.id}/settle`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winnerSide }),
    });
    const data = await res.json();
    if (res.ok) {
      flash(`정산 완료 — 정답 ${data.correctCount}/${data.totalVotes}`);
      load();
    } else {
      alert(data.error || "정산 실패");
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const isExpired = (d: string) => new Date(d) < new Date();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">이벤트매치 관리 <span className="text-sm font-normal text-gray-400 ml-1">{events.length}개</span></h1>
        <button onClick={newEvent} className="h-8 px-4 bg-gray-800 text-white text-[12px] font-bold rounded">새 이벤트 등록</button>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? "이벤트 수정" : "새 이벤트 등록"}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[13px]">
            <div className="lg:col-span-3"><label className="text-[11px] text-gray-500 block mb-1">제목 *</label><input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">팀 A *</label><input value={editing.teamA || ""} onChange={e => setEditing({ ...editing, teamA: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">팀 B *</label><input value={editing.teamB || ""} onChange={e => setEditing({ ...editing, teamB: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">베팅 유형</label><input value={editing.betType || ""} onChange={e => setEditing({ ...editing, betType: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">보상</label><input value={editing.reward || ""} onChange={e => setEditing({ ...editing, reward: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">마감시간 *</label><input type="datetime-local" value={editing.deadline || ""} onChange={e => setEditing({ ...editing, deadline: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div className="lg:col-span-3"><label className="text-[11px] text-gray-500 block mb-1">내용</label><RichEditor value={editing.content || ""} onChange={v => setEditing({ ...editing, content: v })} height={200} /></div>
            <div className="lg:col-span-2"><ImageUpload value={editing.bannerImg || ""} onChange={v => setEditing({ ...editing, bannerImg: v })} category="events" label="배너 이미지" width={200} height={100} /></div>
            <div className="lg:col-span-2"><ImageUpload value={editing.bottomImg || ""} onChange={v => setEditing({ ...editing, bottomImg: v })} category="events" label="하단 이미지" width={200} height={100} /></div>
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
              <th className="px-3 py-2.5 text-center font-semibold">팀A vs 팀B</th>
              <th className="px-3 py-2.5 text-center font-semibold">투표수</th>
              <th className="px-3 py-2.5 text-center font-semibold">마감</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{ev.id}</td>
                <td className="px-3 py-2 font-semibold max-w-[200px] truncate"><button onClick={() => { setEditing({ title: ev.title, content: ev.content || "", teamA: ev.teamA, teamB: ev.teamB, betType: ev.betType, reward: ev.reward, deadline: ev.deadline.slice(0, 16), bannerImg: ev.bannerImg || "", bottomImg: ev.bottomImg || "" }); setEditId(ev.id); }} className="text-blue-600 hover:underline text-left">{ev.title}</button></td>
                <td className="px-3 py-2 text-center text-gray-700">{ev.teamA} vs {ev.teamB}</td>
                <td className="px-3 py-2 text-center font-bold text-blue-600">{ev._count.votes}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] ${isExpired(ev.deadline) ? "text-red-500" : "text-gray-600"}`}>{formatDate(ev.deadline)}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleToggle(ev)} className={`text-[11px] font-bold ${ev.isActive ? "text-green-600" : "text-gray-400"}`}>
                    {ev.isActive ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-2 justify-center flex-wrap">
                    {ev.settledAt ? (
                      <span className="text-[11px] font-bold text-green-700">정산 완료 ({ev.winnerSide})</span>
                    ) : isExpired(ev.deadline) ? (
                      <button onClick={() => handleSettle(ev)} className="text-[12px] font-bold text-purple-600 hover:underline">정산</button>
                    ) : null}
                    <button onClick={() => { setEditing({ title: ev.title, content: ev.content || "", teamA: ev.teamA, teamB: ev.teamB, betType: ev.betType, reward: ev.reward, deadline: ev.deadline.slice(0, 16), bannerImg: ev.bannerImg || "", bottomImg: ev.bottomImg || "" }); setEditId(ev.id); }} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-[12px] font-bold text-red-500 hover:underline">삭제</button>
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

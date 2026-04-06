"use client";

import { useEffect, useState } from "react";

interface Reward {
  id: number;
  activityKey: string;
  label: string;
  points: number;
  exp: number;
  isActive: boolean;
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [editing, setEditing] = useState<Record<number, { points: string; exp: string }>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const sortOrder: Record<string, number> = {
      signup: 1, referral: 2,
      attendance: 10, attendance_3: 11, attendance_7: 12, attendance_14: 13, attendance_30: 14,
      chat: 20, event_join: 30, event_correct: 31,
      analysis_write: 40, post_write: 50, comment_write: 51,
    };
    fetch("/api/admin/rewards").then(r => r.json()).then((data: Reward[]) => {
      data.sort((a, b) => (sortOrder[a.activityKey] ?? 99) - (sortOrder[b.activityKey] ?? 99));
      setRewards(data);
    });
  }, []);

  const startEdit = (r: Reward) => {
    setEditing(prev => ({ ...prev, [r.id]: { points: String(r.points), exp: String(r.exp) } }));
  };

  const cancelEdit = (id: number) => {
    setEditing(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveEdit = async (id: number) => {
    const edit = editing[id];
    if (!edit) return;
    const res = await fetch("/api/admin/rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, points: parseInt(edit.points), exp: parseInt(edit.exp) }),
    });
    if (res.ok) {
      setRewards(prev => prev.map(r => r.id === id ? { ...r, points: parseInt(edit.points), exp: parseInt(edit.exp) } : r));
      cancelEdit(id);
      setMsg("저장되었습니다.");
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const toggleActive = async (r: Reward) => {
    const res = await fetch("/api/admin/rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, isActive: !r.isActive }),
    });
    if (res.ok) {
      setRewards(prev => prev.map(x => x.id === r.id ? { ...x, isActive: !x.isActive } : x));
    }
  };

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-800 mb-1">활동 보상 설정</h1>
      <p className="text-[12px] text-gray-500 mb-4">각 활동별 지급되는 포인트와 경험치를 설정합니다.</p>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-4 py-2.5 text-left font-semibold">활동</th>
              <th className="px-4 py-2.5 text-left font-semibold w-20">키</th>
              <th className="px-4 py-2.5 text-right font-semibold w-28">포인트 (P)</th>
              <th className="px-4 py-2.5 text-right font-semibold w-28">경험치 (EXP)</th>
              <th className="px-4 py-2.5 text-center font-semibold w-16">상태</th>
              <th className="px-4 py-2.5 text-center font-semibold w-28">관리</th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((r, idx) => {
              const ed = editing[r.id];
              // 그룹 구분: 이전 항목과 카테고리가 다르면 구분선 추가
              const prevKey = idx > 0 ? rewards[idx - 1].activityKey : "";
              const curGroup = r.activityKey.startsWith("attendance") ? "attendance" : r.activityKey;
              const prevGroup = prevKey.startsWith("attendance") ? "attendance" : prevKey;
              const groupLabels: Record<string, string> = {
                signup: "👤 가입/추천", referral: "👤 가입/추천",
                attendance: "📅 출석체크",
                chat: "💬 채팅",
                event_join: "🎯 이벤트", event_correct: "🎯 이벤트",
                analysis_write: "📊 분석/게시", post_write: "📊 분석/게시", comment_write: "📊 분석/게시",
              };
              const showGroupHeader = idx === 0 || curGroup !== prevGroup;
              return (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${showGroupHeader && idx > 0 ? "border-t-2 border-t-gray-300" : ""}`}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {showGroupHeader && <span className="text-[9px] font-bold block mb-0.5" style={{ color: "var(--brand)" }}>{groupLabels[r.activityKey] || ""}</span>}
                    {r.label}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-[11px]">{r.activityKey}</td>
                  <td className="px-4 py-2.5 text-right">
                    {ed ? (
                      <input
                        type="number"
                        value={ed.points}
                        onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], points: e.target.value } }))}
                        className="w-24 h-7 px-2 text-right text-[13px] border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="font-mono font-bold text-blue-600">{r.points.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {ed ? (
                      <input
                        type="number"
                        value={ed.exp}
                        onChange={e => setEditing(prev => ({ ...prev, [r.id]: { ...prev[r.id], exp: e.target.value } }))}
                        className="w-24 h-7 px-2 text-right text-[13px] border border-gray-300 rounded"
                      />
                    ) : (
                      <span className="font-mono font-bold text-purple-600">{r.exp.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleActive(r)} className={`text-[11px] font-bold ${r.isActive ? "text-green-600" : "text-gray-400"}`}>
                      {r.isActive ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {ed ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => saveEdit(r.id)} className="text-[11px] font-bold text-white bg-blue-600 px-2 py-1 rounded">저장</button>
                        <button onClick={() => cancelEdit(r.id)} className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">취소</button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(r)} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/components/ui/ImageUpload";
import RichEditor from "@/components/ui/RichEditor";

interface EventItem {
  id: number; title: string; content: string; teamA: string; teamB: string; betType: string;
  betLine: string;
  reward: string; rewardPoints: number | null;
  deadline: string; bannerImg: string; bottomImg: string;
  isActive: boolean; allowDraw: boolean; viewCount: number; createdAt: string;
  winnerSide: string | null; settledAt: string | null;
  _count: { votes: number };
}

const BET_TYPES = ["승패", "승무패", "핸디캡", "언더오버"] as const;
const NEEDS_LINE = (t: string) => t === "핸디캡" || t === "언더오버";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [editing, setEditing] = useState<Record<string, string | boolean | number | null> | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [settling, setSettling] = useState<EventItem | null>(null);
  const [defaultEventReward, setDefaultEventReward] = useState<number>(0); // 활동보상 설정의 event_correct 값
  useEffect(() => {
    fetch("/api/admin/rewards").then(r => r.json()).then((arr: { activityKey: string; points: number }[]) => {
      const r = Array.isArray(arr) ? arr.find(x => x.activityKey === "event_correct") : null;
      if (r) setDefaultEventReward(r.points);
    });
  }, []);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/events").then(r => r.json()).then(setEvents); }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const newEvent = () => {
    const dl = new Date(); dl.setDate(dl.getDate() + 3);
    const kst = new Date(dl.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
    setEditing({ title: "", teamA: "", teamB: "", betType: "승패", betLine: "", reward: "10,000원 포인트", rewardPoints: null, deadline: kst, content: "" });
    setEditId(null);
  };

  const startEdit = (ev: EventItem) => {
    const kst = new Date(new Date(ev.deadline).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
    setEditing({
      title: ev.title, content: ev.content || "", teamA: ev.teamA, teamB: ev.teamB,
      betType: ev.betType || "승패", betLine: ev.betLine || "", reward: ev.reward,
      rewardPoints: ev.rewardPoints,
      deadline: kst,
      bannerImg: ev.bannerImg || "", bottomImg: ev.bottomImg || "",
    });
    setEditId(ev.id);
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
    setSettling(ev);
  };
  // 모달에서 호출
  const submitSettle = async (ev: EventItem, winnerSide: string) => {
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

      <AutoCloseToggle />

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {editing && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">{editId ? "이벤트 수정" : "새 이벤트 등록"}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-[13px]">
            <div className="lg:col-span-3"><label className="text-[11px] text-gray-500 block mb-1">제목 *</label><input value={(editing.title as string) || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">팀 A *</label><input value={(editing.teamA as string) || ""} onChange={e => setEditing({ ...editing, teamA: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div><label className="text-[11px] text-gray-500 block mb-1">팀 B *</label><input value={(editing.teamB as string) || ""} onChange={e => setEditing({ ...editing, teamB: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">베팅 유형</label>
              <div className="flex gap-2">
                <select value={(editing.betType as string) || "승패"}
                  onChange={e => setEditing({ ...editing, betType: e.target.value, ...(NEEDS_LINE(e.target.value) ? {} : { betLine: "" }) })}
                  className="flex-1 h-8 px-2 border border-gray-300 rounded text-[13px]">
                  {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {NEEDS_LINE((editing.betType as string) || "") && (
                  <input
                    value={(editing.betLine as string) || ""}
                    onChange={e => setEditing({ ...editing, betLine: e.target.value })}
                    placeholder="기준점 (예: -1.5)"
                    className="w-28 h-8 px-2 border border-gray-300 rounded text-[13px]"
                  />
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="text-[11px] text-gray-500 block mb-1">보상</label>
              <div className="flex gap-3 items-center mb-1">
                <label className="flex items-center gap-1 text-[12px] font-bold cursor-pointer">
                  <input type="radio" name="rewardMode" checked={editing.rewardPoints === null || editing.rewardPoints === undefined}
                    onChange={() => setEditing({ ...editing, rewardPoints: null })} />
                  기본 보상 사용 <span className="text-[10px] text-gray-400">({defaultEventReward.toLocaleString()}P)</span>
                </label>
                <label className="flex items-center gap-1 text-[12px] font-bold cursor-pointer">
                  <input type="radio" name="rewardMode" checked={editing.rewardPoints !== null && editing.rewardPoints !== undefined}
                    onChange={() => setEditing({ ...editing, rewardPoints: editing.rewardPoints ?? defaultEventReward })} />
                  수동 보상 입력
                </label>
                <a href="/admin/rewards" target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] text-blue-600 hover:underline">활동 보상 설정 →</a>
              </div>
              <div className="flex gap-2">
                <input value={(editing.reward as string) || ""} onChange={e => setEditing({ ...editing, reward: e.target.value })}
                  placeholder="사용자에게 보일 보상 문구 (예: 10,000원 포인트)"
                  className="flex-1 h-8 px-2 border border-gray-300 rounded text-[13px]" />
                {editing.rewardPoints !== null && editing.rewardPoints !== undefined && (
                  <div className="flex items-center gap-1">
                    <input type="number" min={0} value={editing.rewardPoints as number}
                      onChange={e => setEditing({ ...editing, rewardPoints: parseInt(e.target.value) || 0 })}
                      placeholder="포인트"
                      className="w-28 h-8 px-2 border border-amber-400 bg-amber-50 rounded text-[13px] font-bold" />
                    <span className="text-[11px] text-gray-500">P</span>
                  </div>
                )}
              </div>
              {editing.rewardPoints !== null && editing.rewardPoints !== undefined && (
                <p className="text-[10px] text-amber-700 mt-1">💰 정답자에게 <strong>{(editing.rewardPoints as number).toLocaleString()}P</strong> 지급 (활동 보상 설정 무시)</p>
              )}
            </div>
            <div><label className="text-[11px] text-gray-500 block mb-1">마감시간 * <span className="text-[10px] text-gray-400">(KST)</span></label><input type="datetime-local" value={(editing.deadline as string) || ""} onChange={e => setEditing({ ...editing, deadline: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[13px]" /></div>
            <div className="lg:col-span-3"><label className="text-[11px] text-gray-500 block mb-1">내용</label><RichEditor value={(editing.content as string) || ""} onChange={v => setEditing({ ...editing, content: v })} height={200} /></div>
            <div className="lg:col-span-2"><ImageUpload value={(editing.bannerImg as string) || ""} onChange={v => setEditing({ ...editing, bannerImg: v })} category="events" label="배너 이미지" width={200} height={100} /></div>
            <div className="lg:col-span-2"><ImageUpload value={(editing.bottomImg as string) || ""} onChange={v => setEditing({ ...editing, bottomImg: v })} category="events" label="하단 이미지" width={200} height={100} /></div>
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
                <td className="px-3 py-2 font-semibold max-w-[200px] truncate"><button onClick={() => startEdit(ev)} className="text-blue-600 hover:underline text-left">{ev.title}</button></td>
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
                      <button onClick={() => setSettling(ev)} className="text-[11px] font-bold text-green-700 hover:underline">정산 완료 ({ev.winnerSide}) 🔍</button>
                    ) : isExpired(ev.deadline) ? (
                      <button onClick={() => handleSettle(ev)} className="text-[12px] font-bold text-purple-600 hover:underline">정산</button>
                    ) : null}
                    <button onClick={() => startEdit(ev)} className="text-[12px] font-bold text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(ev.id)} className="text-[12px] font-bold text-red-500 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {settling && (
        <SettleModal
          event={settling}
          onClose={() => setSettling(null)}
          onSubmit={async (winnerSide) => {
            await submitSettle(settling, winnerSide);
            setSettling(null);
          }}
        />
      )}
    </div>
  );
}

interface Voter { id: number; userId: number; nickname: string; username: string; pick: string; isCorrect: boolean | null; createdAt: string }

function SettleModal({ event, onClose, onSubmit }: { event: EventItem; onClose: () => void; onSubmit: (winnerSide: string) => Promise<void> }) {
  const [winnerSide, setWinnerSide] = useState("");
  const [voters, setVoters] = useState<Voter[]>([]);
  const [counts, setCounts] = useState({ A: 0, B: 0, DRAW: 0 });
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "A" | "B" | "DRAW">("all");

  const isSettled = !!event.settledAt;

  // betType별 선택지 정의
  const options: { value: string; label: string }[] = (() => {
    if (event.betType === "승무패") return [{ value: "A", label: `${event.teamA} 승` }, { value: "DRAW", label: "무승부" }, { value: "B", label: `${event.teamB} 승` }];
    if (event.betType === "핸디캡") return [{ value: "A", label: `${event.teamA} (홈) 승` }, { value: "B", label: `${event.teamB} (원정) 승` }];
    if (event.betType === "언더오버") return [{ value: "A", label: `오버 ${event.betLine || ""}` }, { value: "B", label: `언더 ${event.betLine || ""}` }];
    // 승패 (기본)
    return [{ value: "A", label: `${event.teamA} 승` }, { value: "B", label: `${event.teamB} 승` }, { value: "DRAW", label: "무효 처리" }];
  })();

  useEffect(() => {
    fetch(`/api/admin/events/${event.id}`).then(r => r.json()).then(d => {
      setVoters(Array.isArray(d.voters) ? d.voters : []);
      setCounts({ A: d.votesA || 0, B: d.votesB || 0, DRAW: d.votesDraw || 0 });
    });
  }, [event.id]);

  const labelFor = (pick: string) => options.find(o => o.value === pick)?.label || pick;
  const filtered = filter === "all" ? voters : voters.filter(v => v.pick === filter);
  const correctCount = voters.filter(v => v.isCorrect === true).length;
  const incorrectCount = voters.filter(v => v.isCorrect === false).length;
  const totalForRate = correctCount + incorrectCount;
  const correctRate = totalForRate > 0 ? Math.round((correctCount / totalForRate) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">
            {isSettled ? "정산 내역" : "이벤트 정산"}
            {isSettled && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">완료</span>}
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5 truncate">{event.title}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{event.betType}{event.betLine ? ` ${event.betLine}` : ""} · {event.teamA} vs {event.teamB}</p>
        </div>

        {isSettled ? (
          <div className="px-5 py-3 border-b border-gray-100 bg-green-50/50">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="text-gray-500 font-bold mb-0.5">정산 결과</p>
                <p className="text-[14px] font-black text-green-700">{labelFor(event.winnerSide || "")}</p>
              </div>
              <div>
                <p className="text-gray-500 font-bold mb-0.5">정산 시각</p>
                <p className="text-gray-800 font-bold">{event.settledAt ? new Date(event.settledAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}</p>
              </div>
              <div>
                <p className="text-gray-500 font-bold mb-0.5">정답 / 오답</p>
                <p className="text-gray-800">
                  <span className="font-black text-green-600">{correctCount}</span>
                  <span className="text-gray-400"> / </span>
                  <span className="font-black text-red-500">{incorrectCount}</span>
                  <span className="text-gray-400 text-[10px] ml-1">({correctRate}%)</span>
                </p>
              </div>
              <div>
                <p className="text-gray-500 font-bold mb-0.5">적용 보상</p>
                <p className="text-gray-800 font-bold">
                  {event.rewardPoints !== null && event.rewardPoints !== undefined && event.rewardPoints > 0 ? (
                    <><span className="text-amber-700">💰 수동 {event.rewardPoints.toLocaleString()}P</span></>
                  ) : (
                    <span className="text-blue-700">⚙️ 기본 보상</span>
                  )}
                  <span className="text-gray-400 text-[10px] ml-1">/ 총 {voters.length}명</span>
                </p>
              </div>
            </div>
            {event.winnerSide === "DRAW" && event.betType !== "승무패" && (
              <p className="mt-2 text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded">⚠️ 무효 처리 — 모든 투표가 정답/오답 처리되지 않았습니다 (보상 미지급).</p>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 border-b border-gray-100">
            <label className="text-[12px] font-bold text-gray-700 block mb-1">정산 결과 선택</label>
            <select value={winnerSide} onChange={e => setWinnerSide(e.target.value)} className="w-full h-9 px-2 border border-gray-300 rounded text-[13px]">
              <option value="">— 선택 —</option>
              {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-[10px] mt-1.5">
              {event.rewardPoints !== null && event.rewardPoints !== undefined && event.rewardPoints > 0 ? (
                <span className="text-amber-700">💰 정답자 1인당 <strong>{event.rewardPoints.toLocaleString()}P</strong> 지급 (수동 보상)</span>
              ) : (
                <span className="text-gray-500">⚙️ 활동 보상 설정값(event_correct) 적용</span>
              )}
            </p>
          </div>
        )}

        <div className="px-5 py-3 flex-1 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-bold text-gray-700">투표자 목록 (총 {voters.length}명)</p>
            <div className="flex gap-1">
              {(["all", ...options.map(o => o.value)] as const).map(f => (
                <button key={f} onClick={() => setFilter(f as "all" | "A" | "B" | "DRAW")}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${filter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f === "all" ? `전체 ${voters.length}` : `${labelFor(f)} (${counts[f as "A" | "B" | "DRAW"] || 0})`}
                </button>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded">
            <table className="w-full text-[12px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">닉네임</th>
                  <th className="px-2 py-1.5 text-left font-semibold">선택</th>
                  <th className="px-2 py-1.5 text-right font-semibold">투표 시각</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={3} className="px-2 py-4 text-center text-gray-400">투표 내역 없음</td></tr>
                ) : filtered.map(v => (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className="px-2 py-1">
                      <a href={`/admin/users/${v.userId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">{v.nickname}</a>
                      <span className="text-[10px] text-gray-400 ml-1">{v.username}</span>
                    </td>
                    <td className="px-2 py-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: v.pick === "A" ? "#dbeafe" : v.pick === "B" ? "#fee2e2" : "#fef3c7", color: v.pick === "A" ? "#2563eb" : v.pick === "B" ? "#dc2626" : "#d97706" }}>
                        {labelFor(v.pick)}
                      </span>
                      {v.isCorrect === true && <span className="text-[10px] font-bold ml-1 text-green-600">✓ 정답</span>}
                      {v.isCorrect === false && <span className="text-[10px] font-bold ml-1 text-red-500">✗</span>}
                    </td>
                    <td className="px-2 py-1 text-right text-[10px] text-gray-400">{new Date(v.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="h-8 px-4 text-[12px] font-bold rounded border border-gray-300 text-gray-600">
            {isSettled ? "닫기" : "취소"}
          </button>
          {!isSettled && <button onClick={async () => {
            if (!winnerSide) { alert("정산 결과를 선택해주세요."); return; }
            if (!confirm(`"${labelFor(winnerSide)}"로 정산합니다. 정답자에게 보상 + 연승 갱신이 즉시 처리됩니다. 진행할까요?`)) return;
            setBusy(true);
            try { await onSubmit(winnerSide); } finally { setBusy(false); }
          }} disabled={busy || !winnerSide} className="h-8 px-4 text-[12px] font-bold rounded text-white bg-purple-600 disabled:opacity-40">
            {busy ? "처리 중..." : "정산 실행"}
          </button>}
        </div>
      </div>
    </div>
  );
}

function AutoCloseToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(d => setEnabled(!!d?.autoCloseEventsEnabled));
  }, []);
  if (enabled === null) return null;

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    await fetch("/api/admin/site-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoCloseEventsEnabled: next }) });
    setSaving(false);
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex items-center justify-between">
      <div>
        <p className="text-[13px] font-bold text-gray-800">⏰ 자동 마감 (정산 준비)</p>
        <p className="text-[11px] text-gray-500 mt-0.5">deadline 도달 시 자동으로 isActive=false 처리 (1분 cron). OFF 시 관리자가 수동 마감.</p>
      </div>
      <button onClick={toggle} disabled={saving}
        className="relative w-11 h-6 rounded-full transition-colors shrink-0"
        style={{ background: enabled ? "var(--brand)" : "#cbd5e1" }}>
        <span className="absolute rounded-full transition-all" style={{ top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)" }} />
      </button>
    </div>
  );
}

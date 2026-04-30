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

      <EventStreakSection />
      <BirthdayBonusSection />
      <AnalysisPermissionSection />
      <ChatRewardCapSection />
    </div>
  );
}

interface SiteSettingShape {
  birthdayBonusEnabled: boolean;
  allowUserAnalysis: boolean;
  analysisRewardDailyLimit: number;
  chatRewardDailyPointCap: number;
  chatRewardDailyExpCap: number;
  chatMinLength: number;
  chatMinLengthEnabled: boolean;
  chatDuplicateBlockEnabled: boolean;
}

function useSiteSettings() {
  const [s, setS] = useState<SiteSettingShape | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(setS).catch(() => {});
  }, []);
  const patch = async (body: Partial<SiteSettingShape>) => {
    if (!s) return;
    setSaving(true);
    setS({ ...s, ...body } as SiteSettingShape);
    await fetch("/api/admin/site-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
  };
  return { s, saving, patch };
}

// ─── 생일 축하 자동 보상 ─────────────
function BirthdayBonusSection() {
  const { s, saving, patch } = useSiteSettings();
  if (!s) return null;
  return (
    <div className="mt-8">
      <h2 className="text-base font-bold text-gray-800 mb-3">🎂 생일 축하 자동 보상</h2>
      <p className="text-[11px] text-gray-500 mb-3">
        매일 KST 0시에 생일자에게 자동 지급. 활동보상의 <code>birthday</code> 점수가 적용됩니다. 어느 레벨에서 지급할지는{" "}
        <a href="/admin/levels" className="text-blue-600 hover:underline">레벨 설정</a>의 &lsquo;🎂 생일&rsquo; 체크박스로 설정합니다.
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface)" }}>
          <p className="text-sm">활성화 (마스터 ON/OFF)</p>
          <button
            onClick={() => patch({ birthdayBonusEnabled: !s.birthdayBonusEnabled })}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: s.birthdayBonusEnabled ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: s.birthdayBonusEnabled ? "22px" : "2px" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 분석글 작성 권한 ─────────────
function AnalysisPermissionSection() {
  const { s, saving, patch } = useSiteSettings();
  const [localLimit, setLocalLimit] = useState<number | null>(null);
  useEffect(() => { if (s) setLocalLimit(s.analysisRewardDailyLimit); }, [s]);
  if (!s || localLimit === null) return null;
  return (
    <div className="mt-8">
      <h2 className="text-base font-bold text-gray-800 mb-3">📝 분석글 작성 권한</h2>
      <p className="text-[11px] text-gray-500 mb-3">
        OFF: 픽스터/관리자 전용 / ON: 일반 유저도 작성 가능. 보상은 하루 N회까지 자동 지급 (0 = 무제한).
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--surface)" }}>
          <p className="text-sm">일반 유저 작성 허용</p>
          <button
            onClick={() => patch({ allowUserAnalysis: !s.allowUserAnalysis })}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: s.allowUserAnalysis ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: s.allowUserAnalysis ? "22px" : "2px" }} />
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface)" }}>
          <p className="text-sm">일일 보상 지급 횟수</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min={0} max={99}
              value={localLimit}
              onChange={e => setLocalLimit(parseInt(e.target.value) || 0)}
              onBlur={e => patch({ analysisRewardDailyLimit: parseInt(e.target.value) || 0 })}
              className="w-24 rounded px-2 py-1 text-sm text-right"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <span className="text-[11px] text-gray-500">회 (0=무제한)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 채팅 메시지 보상 캡 ─────────────
function ChatRewardCapSection() {
  const { s, saving, patch } = useSiteSettings();
  const [local, setLocal] = useState<{ ptCap: number; expCap: number; minLen: number } | null>(null);
  useEffect(() => {
    if (s) setLocal({ ptCap: s.chatRewardDailyPointCap, expCap: s.chatRewardDailyExpCap, minLen: s.chatMinLength });
  }, [s]);
  if (!s || !local) return null;
  return (
    <div className="mt-8">
      <h2 className="text-base font-bold text-gray-800 mb-3">💬 채팅 메시지 보상 캡</h2>
      <p className="text-[11px] text-gray-500 mb-3">
        유저당 1일 적립 한도 + 글자수/중복 차단 옵션. 0 = 무제한.
      </p>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--surface)" }}>
          <p className="text-sm">최소 글자수 제한</p>
          <button
            onClick={() => patch({ chatMinLengthEnabled: !s.chatMinLengthEnabled })}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: s.chatMinLengthEnabled ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: s.chatMinLengthEnabled ? "22px" : "2px" }} />
          </button>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--surface)" }}>
          <p className="text-sm">중복 메시지 차단</p>
          <button
            onClick={() => patch({ chatDuplicateBlockEnabled: !s.chatDuplicateBlockEnabled })}
            disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: s.chatDuplicateBlockEnabled ? "var(--brand)" : "#d1d5db" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: s.chatDuplicateBlockEnabled ? "22px" : "2px" }} />
          </button>
        </div>
        {([
          { key: "chatRewardDailyPointCap" as const, label: "1일 포인트 캡", localKey: "ptCap" as const, suffix: "P (0=무제한)" },
          { key: "chatRewardDailyExpCap" as const, label: "1일 경험치 캡", localKey: "expCap" as const, suffix: "EXP (0=무제한)" },
          { key: "chatMinLength" as const, label: "최소 글자수", localKey: "minLen" as const, suffix: "자 이상" },
        ]).map((row, idx, arr) => (
          <div key={row.key} className={`flex items-center justify-between px-4 py-3${idx < arr.length - 1 ? " border-b" : ""}`} style={{ background: "var(--surface)" }}>
            <p className="text-sm">{row.label}</p>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0} max={100000}
                value={local[row.localKey]}
                onChange={e => setLocal({ ...local, [row.localKey]: parseInt(e.target.value) || 0 })}
                onBlur={e => patch({ [row.key]: parseInt(e.target.value) || 0 } as Partial<SiteSettingShape>)}
                className="w-28 rounded px-2 py-1 text-sm text-right"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <span className="text-[11px] text-gray-500">{row.suffix}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface StreakRow { id: number; threshold: number; points: number; exp: number; isActive: boolean }

function EventStreakSection() {
  const [rows, setRows] = useState<StreakRow[]>([]);
  const [editing, setEditing] = useState<{ threshold: string; points: string; exp: string }>({ threshold: "", points: "", exp: "" });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/admin/event-streak-settings").then(r => r.json()).then((d) => Array.isArray(d) ? setRows(d) : setRows([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (saving) return;
    const t = parseInt(editing.threshold);
    if (!t || t < 1) { alert("연승 횟수는 1 이상이어야 합니다."); return; }
    setSaving(true);
    await fetch("/api/admin/event-streak-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: t, points: parseInt(editing.points) || 0, exp: parseInt(editing.exp) || 0, isActive: true }),
    });
    setEditing({ threshold: "", points: "", exp: "" });
    await load();
    setSaving(false);
  };

  const remove = async (threshold: number) => {
    if (!confirm(`${threshold}연승 단계를 삭제할까요?`)) return;
    await fetch(`/api/admin/event-streak-settings/${threshold}`, { method: "DELETE" });
    await load();
  };

  const toggleActive = async (r: StreakRow) => {
    await fetch("/api/admin/event-streak-settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: r.threshold, points: r.points, exp: r.exp, isActive: !r.isActive }),
    });
    await load();
  };

  return (
    <div className="mt-8">
      <h2 className="text-base font-bold text-gray-800 mb-3">🔥 이벤트 연승 보상 단계</h2>
      <p className="text-[11px] text-gray-500 mb-3">이벤트 매치 연승이 아래 조건과 맞을 때 보상이 지급됩니다. 단계는 자유롭게 추가/삭제 가능합니다.</p>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[11px] text-gray-500 block">N연승</label>
            <input type="number" min={1} value={editing.threshold} onChange={e => setEditing({ ...editing, threshold: e.target.value })} placeholder="3" className="w-20 h-8 px-2 border border-gray-300 rounded text-[13px] text-right" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block">포인트</label>
            <input type="number" min={0} value={editing.points} onChange={e => setEditing({ ...editing, points: e.target.value })} placeholder="100" className="w-24 h-8 px-2 border border-gray-300 rounded text-[13px] text-right" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block">경험치</label>
            <input type="number" min={0} value={editing.exp} onChange={e => setEditing({ ...editing, exp: e.target.value })} placeholder="50" className="w-24 h-8 px-2 border border-gray-300 rounded text-[13px] text-right" />
          </div>
          <button onClick={save} disabled={saving} className="h-8 px-4 bg-blue-600 text-white text-[12px] font-bold rounded">추가/수정</button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-4 py-2 text-left font-semibold">단계</th>
              <th className="px-4 py-2 text-right font-semibold">포인트</th>
              <th className="px-4 py-2 text-right font-semibold">경험치</th>
              <th className="px-4 py-2 text-center font-semibold">활성</th>
              <th className="px-4 py-2 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-[12px]">아직 등록된 연승 단계가 없습니다.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-bold">{r.threshold}연승</td>
                <td className="px-4 py-2 text-right">{r.points.toLocaleString()}P</td>
                <td className="px-4 py-2 text-right">{r.exp.toLocaleString()}EXP</td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => toggleActive(r)} className={`text-[11px] font-bold ${r.isActive ? "text-green-600" : "text-gray-400"}`}>
                    {r.isActive ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => remove(r.threshold)} className="text-[12px] font-bold text-red-500 hover:underline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

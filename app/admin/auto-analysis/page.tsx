"use client";

import { useEffect, useState, useCallback } from "react";

const ALL_LEAGUES = ["EPL", "라리가", "세리에A", "분데스리가", "리그앙", "MLB", "NBA", "NHL"];

interface Settings {
  isEnabled: boolean; targetLeagues: string; topN: number;
  cronHour: number; cronMinute: number; aiModel: string; autoPublish: boolean;
}

interface RecentPost {
  id: number; title: string; league: string; homeTeam: string; awayTeam: string;
  homeLogo: string; awayLogo: string;
  isDraft: boolean; matchKey: string; createdAt: string;
}

export default function AdminAutoAnalysisPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState("");
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    fetch("/api/admin/auto-analysis").then(r => r.json()).then(d => {
      if (d.settings) {
        setSettings(d.settings);
        try { setLeagues(JSON.parse(d.settings.targetLeagues)); } catch { setLeagues(["EPL", "MLB", "NBA"]); }
      } else {
        setSettings({ isEnabled: false, targetLeagues: "[]", topN: 4, cronHour: 8, cronMinute: 0, aiModel: "claude", autoPublish: false });
        setLeagues(["EPL", "MLB", "NBA"]);
      }
      setRecentPosts(d.recentPosts || []);
    }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await fetch("/api/admin/auto-analysis", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, targetLeagues: leagues }),
    });
    setSaving(false);
    flash("설정이 저장되었습니다.");
  };

  const handleRun = async () => {
    if (!confirm("지금 자동 분석을 실행하시겠습니까? AI API 비용이 발생할 수 있습니다.")) return;
    setRunning(true);
    setMsg("분석 생성 중... (리그별 경기를 수집하고 AI 분석을 생성합니다. 잠시 기다려주세요.)");
    try {
      const res = await fetch("/api/admin/auto-analysis", { method: "POST" });
      const result = await res.json();
      if (result.error) {
        flash(`오류: ${result.error}`);
      } else {
        flash(`완료! 생성: ${result.created}개, 스킵(중복): ${result.skipped}개${result.errors?.length ? `, 오류: ${result.errors.length}개` : ""}`);
        load();
      }
    } catch { flash("실행 중 오류가 발생했습니다."); }
    setRunning(false);
  };

  const handleBulkPublish = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    await fetch("/api/admin/auto-analysis/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: "publish" }),
    });
    setSelected(new Set());
    flash(`${ids.length}개 글이 게시되었습니다.`);
    load();
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0 || !confirm(`${selected.size}개 글을 삭제하시겠습니까?`)) return;
    const ids = Array.from(selected);
    await fetch("/api/admin/auto-analysis/publish", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action: "delete" }),
    });
    setSelected(new Set());
    flash(`${ids.length}개 글이 삭제되었습니다.`);
    load();
  };

  const toggleLeague = (l: string) => {
    setLeagues(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const set = (key: keyof Settings, val: unknown) => setSettings(prev => prev ? { ...prev, [key]: val } : prev);
  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  if (loading) return <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</p>;
  if (!settings) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>자동 분석 설정</h1>
        <div className="flex gap-2">
          <button onClick={handleRun} disabled={running} className="h-8 px-4 rounded text-[12px] font-bold text-white" style={{ background: "#16a34a", opacity: running ? 0.6 : 1 }}>
            {running ? "생성 중..." : "지금 생성"}
          </button>
          <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded text-[12px] font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </div>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {/* 기본 설정 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>기본 설정</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>자동 분석 활성화</span>
            <input type="checkbox" checked={settings.isEnabled} onChange={e => set("isEnabled", e.target.checked)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>자동 게시 (OFF면 임시저장)</span>
            <input type="checkbox" checked={settings.autoPublish} onChange={e => set("autoPublish", e.target.checked)} />
          </label>
          <div className="flex gap-4">
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>AI 모델</label>
              <select value={settings.aiModel} onChange={e => set("aiModel", e.target.value)} className="h-8 px-2 rounded text-[13px]" style={inputStyle}>
                <option value="claude">Claude</option>
                <option value="gpt">GPT-4o-mini</option>
                <option value="gemini">Gemini 2.0 Flash</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>상위 N위</label>
              <input type="number" min={1} max={10} value={settings.topN} onChange={e => set("topN", parseInt(e.target.value) || 4)} className="w-16 h-8 px-2 rounded text-[13px] text-center" style={inputStyle} />
            </div>
            <div>
              <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>생성 시간 (KST)</label>
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={23} value={settings.cronHour} onChange={e => set("cronHour", parseInt(e.target.value) || 0)} className="w-14 h-8 px-2 rounded text-[13px] text-center" style={inputStyle} />
                <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>:</span>
                <input type="number" min={0} max={59} value={settings.cronMinute} onChange={e => set("cronMinute", parseInt(e.target.value) || 0)} className="w-14 h-8 px-2 rounded text-[13px] text-center" style={inputStyle} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 대상 리그 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>대상 리그</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_LEAGUES.map(l => (
            <button key={l} onClick={() => toggleLeague(l)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
              style={{ background: leagues.includes(l) ? "var(--brand)" : "var(--bg)", color: leagues.includes(l) ? "#fff" : "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--text-secondary)" }}>선택한 리그의 상위 {settings.topN}위 팀이 포함된 경기에 대해 분석글을 자동 생성합니다.</p>
      </div>

      {/* 최근 생성 이력 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>최근 자동 생성 이력 ({recentPosts.length})</h2>
          {selected.size > 0 && (
            <div className="flex gap-1.5">
              <button onClick={handleBulkPublish} className="h-7 px-3 rounded text-[11px] font-bold text-white bg-green-600">
                선택 게시 ({selected.size})
              </button>
              <button onClick={handleBulkDelete} className="h-7 px-3 rounded text-[11px] font-bold text-white bg-red-500">
                선택 삭제
              </button>
            </div>
          )}
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-[12px] py-4 text-center" style={{ color: "var(--text-secondary)" }}>자동 생성된 분석글이 없습니다.</p>
        ) : (
          <>
            {/* 전체 선택 */}
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={selected.size === recentPosts.length && recentPosts.length > 0}
                onChange={e => setSelected(e.target.checked ? new Set(recentPosts.map(p => p.id)) : new Set())} />
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>전체 선택</span>
            </label>
            <div className="space-y-1.5">
              {recentPosts.map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "var(--bg)" }}>
                  <input type="checkbox" checked={selected.has(p.id)}
                    onChange={e => { const s = new Set(selected); if (e.target.checked) { s.add(p.id); } else { s.delete(p.id); } setSelected(s); }} />
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0 ${p.isDraft ? "bg-yellow-500" : "bg-green-600"}`}>
                    {p.isDraft ? "임시" : "게시"}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>{p.league}</span>
                  <div className="flex items-center gap-1 min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.homeLogo && <img src={p.homeLogo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />}
                    <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{p.homeTeam}</span>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>vs</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.awayLogo && <img src={p.awayLogo} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />}
                    <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--text-primary)" }}>{p.awayTeam}</span>
                  </div>
                  <a href={`/analysis/${p.id}`} className="text-[11px] truncate text-blue-600 hover:underline ml-1">{p.title}</a>
                  <span className="text-[10px] shrink-0 ml-auto" style={{ color: "var(--text-secondary)" }}>
                    {new Date(p.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

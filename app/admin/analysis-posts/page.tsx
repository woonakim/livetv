"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminPost {
  id: number;
  title: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  isPremium: boolean;
  isPublic: boolean;
  result: string;
  viewCount: number;          // 실제값
  displayedViewCount: number; // 부풀린 표시값
  likeCount: number;
  fakeViewsEnabled: boolean;
  fakeViewsTarget: number;
  fakeViewsRampHours: number;
  fakeViewsStartAt: string | null;
  fakeViewsManualSet: boolean;
  author: { nickname: string; role: string };
  createdAt: string;
}

interface GlobalCfg {
  enabled: boolean;
  targetMin: number;
  targetMax: number;
  rampHours: number;
}

export default function AdminAnalysisPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;
  const [editing, setEditing] = useState<AdminPost | null>(null);
  const [globalCfg, setGlobalCfg] = useState<GlobalCfg | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/analysis-posts?page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => {
        setPosts(Array.isArray(d.items) ? d.items : []);
        setTotal(d.total || 0);
        if (d.global) setGlobalCfg(d.global);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>분석글 관리</h1>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>총 {total.toLocaleString()}개</span>
      </div>

      {/* 전역 가짜 조회수 설정 */}
      {globalCfg && <GlobalFakeViewsSection initial={globalCfg} onSaved={fetchData} />}

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>ID</th>
              <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>제목</th>
              <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>작성자</th>
              <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>종목</th>
              <th className="px-3 py-2 text-right text-xs font-bold" style={{ color: "var(--text-secondary)" }}>조회수<br /><span className="text-[9px] font-normal">표시(실제)</span></th>
              <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>가짜 조회수</th>
              <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>분석글이 없습니다.</td></tr>
            ) : (
              posts.map((p, idx) => (
                <tr key={p.id} style={{ background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                  <td className="px-3 py-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>#{p.id}</td>
                  <td className="px-3 py-2 max-w-[300px]">
                    <div className="font-bold truncate" style={{ color: "var(--text-primary)" }}>{p.title}</div>
                    <div className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>{p.homeTeam} vs {p.awayTeam}</div>
                  </td>
                  <td className="px-3 py-2 text-[12px]" style={{ color: "var(--text-primary)" }}>{p.author.nickname}<span className="text-[10px] ml-1" style={{ color: "var(--text-secondary)" }}>{p.author.role}</span></td>
                  <td className="px-3 py-2 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>{p.league}</td>
                  <td className="px-3 py-2 text-right text-[12px]" style={{ color: "var(--text-primary)" }}>
                    <div className="font-bold">{p.displayedViewCount.toLocaleString()}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>({p.viewCount.toLocaleString()})</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.fakeViewsEnabled ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#7c3aed" }}>ON · {p.fakeViewsTarget}</span>
                    ) : (
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>OFF</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => setEditing(p)} className="text-[10px] font-bold px-2 py-1 rounded text-white" style={{ background: "#7c3aed" }}>설정</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 text-sm rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page <= 1 ? 0.5 : 1 }}>이전</button>
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 text-sm rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page >= totalPages ? 0.5 : 1 }}>다음</button>
        </div>
      )}

      {editing && (
        <FakeViewsModal
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { fetchData(); setEditing(null); }}
        />
      )}
    </div>
  );
}

function GlobalFakeViewsSection({ initial, onSaved }: { initial: GlobalCfg; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [min, setMin] = useState(initial.targetMin);
  const [max, setMax] = useState(initial.targetMax);
  const [rampHours, setRampHours] = useState(initial.rampHours);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    const res = await fetch("/api/admin/site-settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { flash("✓ 저장됨"); onSaved(); } else flash("✗ 저장 실패");
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #7c3aed" }}>
      <div className="px-4 py-3" style={{ background: "rgba(124,58,237,0.08)", borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>📊 전역 가짜 조회수 (분석글)</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
          신규/기존 모든 분석글에 자동 적용. <strong>개별 설정이 적용된 글</strong>은 우선순위로 개별 설정 사용. min~max 범위 내에서 글 ID 기반 deterministic target.
        </p>
      </div>
      <div className="px-4 py-3 space-y-3" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>전역 활성화</span>
          <button onClick={async () => { const v = !enabled; setEnabled(v); await patch({ fakeViewsAnalysisEnabled: v }); }} disabled={saving}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}>
            <span className="absolute rounded-full transition-all" style={{ top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)" }} />
          </button>
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>도달 목표 범위 (min ~ max)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={min} onChange={e => setMin(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>~</span>
            <input type="number" min={0} value={max} onChange={e => setMax(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <button onClick={() => {
              if (min < 0 || max < 0 || max < min) { flash("✗ 잘못된 범위"); return; }
              patch({ fakeViewsAnalysisTargetMin: min, fakeViewsAnalysisTargetMax: max });
            }} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>저장</button>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Ramp 시간 (시간 단위)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} value={rampHours} onChange={e => setRampHours(parseInt(e.target.value) || 24)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>시간</span>
            <button onClick={() => { if (rampHours < 1) return flash("✗ 1 이상"); patch({ fakeViewsAnalysisRampHours: rampHours }); }} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: "var(--brand)" }}>저장</button>
          </div>
        </div>
        {msg && <p className="text-[11px] font-bold" style={{ color: msg.startsWith("✓") ? "#10b981" : "#ef4444" }}>{msg}</p>}
      </div>
    </div>
  );
}

function FakeViewsModal({ post, onClose, onSaved }: { post: AdminPost; onClose: () => void; onSaved: () => void }) {
  const [manualSet, setManualSet] = useState(post.fakeViewsManualSet);
  const [enabled, setEnabled] = useState(post.fakeViewsEnabled);
  const [target, setTarget] = useState(post.fakeViewsTarget);
  const [rampHours, setRampHours] = useState(post.fakeViewsRampHours || 24);
  const [restart, setRestart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (manualSet) {
      if (target < 0) { setErr("target은 0 이상."); return; }
      if (rampHours < 1) { setErr("ramp 시간은 1 이상."); return; }
    }
    setSaving(true);
    const body: Record<string, unknown> = { fakeViewsManualSet: manualSet };
    if (manualSet) {
      body.fakeViewsEnabled = enabled;
      body.fakeViewsTarget = target;
      body.fakeViewsRampHours = rampHours;
      if (restart) body.fakeViewsRestart = true;
    }
    const res = await fetch(`/api/analysis/${post.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const j = await res.json().catch(() => ({})); setErr(j.error || "저장 실패"); }
  };

  // 미리보기: sqrt 곡선 진행 예시
  const previewElapsed = post.fakeViewsStartAt ? (Date.now() - new Date(post.fakeViewsStartAt).getTime()) / (1000 * 60 * 60) : 0;
  const previewProgress = Math.min(1, Math.max(0, previewElapsed / Math.max(1, rampHours)));
  const previewBoost = Math.round(target * Math.sqrt(previewProgress));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-[440px] max-w-[92vw] rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black mb-1" style={{ color: "var(--text-primary)" }}>📊 가짜 조회수 설정</h3>
        <p className="text-[11px] mb-3 truncate" style={{ color: "var(--text-secondary)" }}>#{post.id} · {post.title}</p>
        <div className="rounded-lg p-3 mb-4 text-[11px] space-y-1" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
          <p>• <strong>target</strong>: 도달 목표 boost (예: 1000 → 실제값 + 1000까지)</p>
          <p>• <strong>ramp 시간</strong>: 0 → target까지 sqrt 곡선으로 천천히 증가하는 시간</p>
          <p>• 곡선: 1시간에 ~20%, 6시간에 ~50%, 24시간에 100%</p>
          <p>• 단조 증가 — 조회수가 줄어들지 않음</p>
        </div>

        <div className="space-y-3">
          {/* 모드 선택 */}
          <div className="flex gap-2">
            <button onClick={() => setManualSet(false)} disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: !manualSet ? "var(--brand)" : "var(--bg)",
                color: !manualSet ? "#fff" : "var(--text-primary)",
                border: "1px solid " + (!manualSet ? "var(--brand)" : "var(--border)"),
              }}>전역 설정 사용</button>
            <button onClick={() => setManualSet(true)} disabled={saving}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: manualSet ? "var(--brand)" : "var(--bg)",
                color: manualSet ? "#fff" : "var(--text-primary)",
                border: "1px solid " + (manualSet ? "var(--brand)" : "var(--border)"),
              }}>개별 설정</button>
          </div>
          {!manualSet && (
            <div className="rounded-lg p-2 text-[11px]" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>
              💡 전역 설정(상단 보라색 박스)이 적용됩니다. 비활성화하려면 &quot;개별 설정&quot;을 선택 후 활성화 OFF로 저장.
            </div>
          )}
          {manualSet && <>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>활성화</span>
            <button onClick={() => setEnabled(!enabled)} disabled={saving}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}>
              <span className="absolute rounded-full transition-all" style={{ top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)" }} />
            </button>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>도달 목표 (target)</label>
            <input type="number" min={0} value={target} onChange={e => setTarget(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Ramp 시간 (시간 단위)</label>
            <input type="number" min={1} value={rampHours} onChange={e => setRampHours(parseInt(e.target.value) || 24)}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          </>}
          {manualSet && post.fakeViewsStartAt && (
            <div className="rounded-lg p-2 text-[11px]" style={{ background: "var(--bg)" }}>
              <p style={{ color: "var(--text-secondary)" }}>현재 진행</p>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                시작: {new Date(post.fakeViewsStartAt).toLocaleString("ko-KR")} · 경과 {previewElapsed.toFixed(1)}h · 진행 {(previewProgress * 100).toFixed(0)}% · 현재 boost {previewBoost.toLocaleString()}
              </p>
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={restart} onChange={e => setRestart(e.target.checked)} />
                <span style={{ color: "var(--text-primary)" }}>저장 시 ramp 재시작 (지금부터 다시 0 → target)</span>
              </label>
            </div>
          )}
        </div>

        {err && <p className="text-[11px] font-bold mt-3" style={{ color: "#ef4444" }}>{err}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>취소</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "var(--brand)" }}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

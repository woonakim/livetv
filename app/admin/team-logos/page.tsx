"use client";

import { useCallback, useEffect, useState } from "react";

interface MissingTeam {
  team: string;
  sport: string;
  leagues: string[];
  source: "broadcast" | "youtube" | "both";
}

interface Candidate {
  name: string;
  imageUrl: string;
  source: "thesportsdb" | "wikipedia";
  description?: string;
}

const SPORT_LABELS: Record<string, string> = {
  soccer: "축구",
  baseball: "야구",
  basketball: "농구",
  volleyball: "배구",
  hockey: "하키",
  esports: "E스포츠",
  lol: "LOL",
  ufc: "UFC",
};

const SOURCE_LABELS: Record<string, string> = {
  broadcast: "중계",
  youtube: "유튜브",
  both: "중계+유튜브",
};

export default function TeamLogosMissingPage() {
  const [teams, setTeams] = useState<MissingTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  const [selected, setSelected] = useState<MissingTeam | null>(null);
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const loadMissing = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/team-logos/missing?t=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const text = await res.text();
      if (!res.ok) {
        setLoadError(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        setTeams([]);
        return;
      }
      let data: { count?: number; teams?: MissingTeam[] };
      try {
        data = JSON.parse(text);
      } catch {
        setLoadError(`응답 파싱 실패: ${text.slice(0, 200)}`);
        setTeams([]);
        return;
      }
      setTeams(data.teams || []);
      setLastFetched(new Date().toLocaleTimeString("ko-KR"));
    } catch (e) {
      setLoadError(`네트워크 오류: ${(e as Error).message}`);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMissing(); }, [loadMissing]);

  const openSearch = (t: MissingTeam) => {
    setSelected(t);
    setQuery(t.team);
    setCandidates([]);
    runSearch(t.team);
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setCandidates([]);
    try {
      const res = await fetch(`/api/admin/team-logos/search?q=${encodeURIComponent(q)}`, { cache: "no-store" });
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch {
      setToast({ type: "err", msg: "검색 실패" });
    } finally {
      setSearching(false);
    }
  };

  const saveLogo = async (c: Candidate) => {
    if (!selected) return;
    setSaving(true);
    try {
      const league = selected.leagues[0] || "";
      const res = await fetch("/api/admin/team-logos/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kr: selected.team,
          nameEn: c.name,
          sport: selected.sport,
          league,
          imageUrl: c.imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setToast({ type: "ok", msg: `${selected.team} 저장 완료` });
      setTeams((prev) => prev.filter((t) => !(t.team === selected.team && t.sport === selected.sport)));
      setSelected(null);
    } catch (e) {
      setToast({ type: "err", msg: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = teams.filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return t.team.toLowerCase().includes(q) || t.sport.includes(q) || t.leagues.some((l) => l.toLowerCase().includes(q));
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">팀 로고 검색</h1>
          <p className="text-[12px] text-gray-500 mt-1">중계·유튜브에서 로고가 없는 팀을 찾아 공식 로고를 수동 매칭합니다.</p>
          {lastFetched && (
            <p className="text-[11px] text-gray-400 mt-1">마지막 갱신: {lastFetched} · 총 {teams.length}건</p>
          )}
        </div>
        <button
          onClick={loadMissing}
          disabled={loading}
          className="text-[12px] font-bold px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700"
        >
          <i className="fas fa-sync-alt mr-1" /> 새로고침
        </button>
      </div>

      {loadError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-[12px] text-red-700">
          <i className="fas fa-exclamation-triangle mr-2" />
          <span className="font-bold">로드 실패:</span> {loadError}
          <button onClick={loadMissing} className="ml-3 underline font-bold">재시도</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <span className="text-[12px] font-bold text-gray-700">누락 팀: {filtered.length}건</span>
          <input
            type="text"
            placeholder="팀/리그/종목 검색"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 text-[12px] px-3 py-1.5 border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-[13px] text-gray-500">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-gray-500">모든 팀에 로고가 등록되어 있습니다.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((t) => (
              <div key={`${t.team}|${t.sport}`} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                    {SPORT_LABELS[t.sport] || t.sport}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">
                    {SOURCE_LABELS[t.source] || t.source}
                  </span>
                  <span className="text-[14px] font-bold text-gray-800 truncate">{t.team}</span>
                  <span className="text-[11px] text-gray-500 truncate">
                    {t.leagues.join(", ")}
                  </span>
                </div>
                <button
                  onClick={() => openSearch(t)}
                  className="text-[12px] font-bold px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 shrink-0 ml-3"
                >
                  <i className="fas fa-search mr-1" /> 검색
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-auto py-10 px-4" onClick={() => !saving && setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-gray-800">{selected.team}</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {SPORT_LABELS[selected.sport] || selected.sport} · {selected.leagues.join(", ")}
                </p>
              </div>
              <button onClick={() => !saving && setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-times text-[18px]" />
              </button>
            </div>

            <div className="px-5 py-4 border-b border-gray-200 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
                className="flex-1 text-[13px] px-3 py-2 border border-gray-300 rounded focus:border-blue-400 focus:outline-none"
                placeholder="영문명/한글명으로 검색 (예: Bournemouth, 본머스)"
              />
              <button
                onClick={() => runSearch(query)}
                disabled={searching}
                className="text-[13px] font-bold px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? "검색중..." : "검색"}
              </button>
            </div>

            <div className="px-5 py-4 max-h-[60vh] overflow-auto">
              {searching ? (
                <div className="text-center text-[13px] text-gray-500 py-8">검색 중...</div>
              ) : candidates.length === 0 ? (
                <div className="text-center text-[13px] text-gray-500 py-8">
                  검색 결과가 없습니다. 다른 이름으로 시도해보세요.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {candidates.map((c, idx) => (
                    <div key={idx} className="border border-gray-200 rounded p-3 flex flex-col items-center gap-2 hover:border-blue-400 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="w-24 h-24 object-contain bg-gray-50 rounded"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
                      />
                      <div className="text-[12px] font-bold text-gray-800 text-center truncate w-full">{c.name}</div>
                      <div className="text-[10px] text-gray-500 text-center truncate w-full">
                        [{c.source}] {c.description || ""}
                      </div>
                      <button
                        onClick={() => saveLogo(c)}
                        disabled={saving}
                        className="w-full text-[11px] font-bold px-2 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {saving ? "저장중..." : "이 로고 사용"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[60] px-4 py-2.5 rounded-lg shadow-lg text-[13px] font-bold"
          style={{
            background: toast.type === "ok" ? "#dcfce7" : "#fee2e2",
            color: toast.type === "ok" ? "#15803d" : "#dc2626",
          }}
        >
          <i className={`fas ${toast.type === "ok" ? "fa-check-circle" : "fa-exclamation-circle"} mr-2`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}

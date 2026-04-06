"use client";

import { useState, useEffect } from "react";

const WIDGET_SPORTS = [
  { id: "soccer", icon: "⚽", label: "축구" },
  { id: "baseball", icon: "⚾", label: "야구" },
  { id: "basketball", icon: "🏀", label: "농구" },
  { id: "volleyball", icon: "🏐", label: "배구" },
  { id: "hockey", icon: "🏒", label: "하키" },
];

const WIDGET_LEAGUES: Record<string, { id: string; label: string }[]> = {
  soccer: [
    { id: "EPL", label: "EPL" }, { id: "라리가", label: "라리가" },
    { id: "분데스리가", label: "분데스리가" }, { id: "세리에A", label: "세리에A" },
    { id: "리그앙", label: "리그앙" }, { id: "에레디비시", label: "에레디비시" },
  ],
  baseball: [
    { id: "KBO", label: "KBO" }, { id: "퓨처스", label: "퓨처스" },
    { id: "MLB(AL)", label: "MLB(AL)" }, { id: "MLB(NL)", label: "MLB(NL)" },
    { id: "NPB(CL)", label: "NPB(CL)" }, { id: "NPB(PL)", label: "NPB(PL)" },
  ],
  basketball: [
    { id: "NBA 동부", label: "NBA 동부" }, { id: "NBA 서부", label: "NBA 서부" },
    { id: "KBL", label: "KBL" }, { id: "WKBL", label: "WKBL" },
  ],
  volleyball: [
    { id: "V리그(남)", label: "V리그(남)" }, { id: "V리그(여)", label: "V리그(여)" },
  ],
  hockey: [
    { id: "NHL", label: "NHL" }, { id: "KHL", label: "KHL" },
  ],
};

interface TeamRow {
  rank: number;
  team: string;
  logo: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  pts: string;
}

interface LeagueData {
  sport: string;
  league: string;
  division?: string;
  teams: TeamRow[];
}

const NO_DRAW = new Set(["baseball", "basketball"]);

export default function StandingsWidget() {
  const [activeSport, setActiveSport] = useState("soccer");
  const [activeLeague, setActiveLeague] = useState("EPL");
  const [allData, setAllData] = useState<LeagueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/standings")
      .then(r => r.json())
      .then(data => setAllData(data.standings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const leagues = WIDGET_LEAGUES[activeSport] ?? [];
  const filtered = allData.filter(s => s.league === activeLeague && s.teams.length > 0);
  const hideDraw = NO_DRAW.has(activeSport);



  const handleSportChange = (sportId: string) => {
    setActiveSport(sportId);
    const first = WIDGET_LEAGUES[sportId]?.[0];
    if (first) setActiveLeague(first.id);
  };

  const handleLeagueChange = (leagueId: string) => {
    setActiveLeague(leagueId);
  };

  return (
    <div
      className="rounded-lg overflow-hidden shadow-card"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* 대분류 종목 탭 */}
      <div className="p-1" style={{ background: "var(--brand)" }}>
        <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {WIDGET_SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSportChange(s.id)}
              className="flex-1 min-w-0 py-1 px-1 rounded text-[11px] text-white text-center transition-colors whitespace-nowrap"
              style={{
                background: activeSport === s.id ? "rgba(255,255,255,0.25)" : "transparent",
                fontWeight: activeSport === s.id ? 800 : 500,
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 소분류 리그 탭 */}
      <div className="p-1" style={{ background: "var(--brand)" }}>
        <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {leagues.map((lg) => (
            <button
              key={lg.id}
              onClick={() => handleLeagueChange(lg.id)}
              className="shrink-0 py-1 px-2.5 rounded text-[11px] text-white transition-colors"
              style={{
                background: activeLeague === lg.id ? "rgba(255,255,255,0.25)" : "transparent",
                fontWeight: activeLeague === lg.id ? 800 : 500,
              }}
            >
              {lg.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="py-4 text-center">
          <div className="w-5 h-5 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
        </div>
      )}

      {/* 데이터 없음 */}
      {!loading && filtered.length === 0 && (
        <div className="py-4 text-center text-[11px]" style={{ color: "var(--text-secondary)" }}>데이터 없음</div>
      )}

      {/* 디비전별 순위표 */}
      {filtered.map((section, si) => (
        <div key={`${section.league}-${section.division ?? si}`}>
          {/* 디비전 제목 */}
          {section.division && (
            <div className="px-2 py-1.5 text-[11px] font-bold" style={{ background: "var(--bg)", color: "var(--brand)", borderTop: si > 0 ? "2px solid var(--border)" : "none" }}>
              {section.division}
            </div>
          )}
          {/* 테이블 헤더 */}
          <div
            className="grid text-[10px] font-bold px-2 py-1"
            style={{
              gridTemplateColumns: hideDraw ? "20px 1fr 26px 26px 40px" : "20px 1fr 26px 26px 26px 40px",
              color: "var(--text-secondary)",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg)",
            }}
          >
            <span className="text-center">#</span>
            <span>팀</span>
            <span className="text-center">승</span>
            {!hideDraw && <span className="text-center">무</span>}
            <span className="text-center">패</span>
            <span className="text-right pr-1">승점</span>
          </div>
          {/* 데이터 행 */}
          {section.teams.map((row, i) => (
            <div
              key={`${row.team}-${i}`}
              className="grid items-center px-2 py-1.5 text-[11px]"
              style={{
                gridTemplateColumns: hideDraw ? "20px 1fr 28px 28px 46px" : "20px 1fr 28px 28px 28px 46px",
                background: i % 2 === 1 ? "var(--bg)" : "var(--surface)",
                borderBottom: i < section.teams.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                className="text-center font-black text-[10px] w-4 h-4 flex items-center justify-center rounded-full mx-auto"
                style={i < 3 ? { background: "var(--brand)", color: "#fff" } : { color: "var(--text-secondary)" }}
              >{row.rank || i + 1}</span>
              <span className="font-semibold truncate pr-1 flex items-center gap-1" style={{ color: "var(--text-primary)" }}>
                {row.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.logo} alt="" width={16} height={16} className="w-4 h-4 object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                {row.team}
              </span>
              <span className="text-center font-bold" style={{ color: "#22c55e" }}>{row.won}</span>
              {!hideDraw && <span className="text-center" style={{ color: "var(--text-secondary)" }}>{row.drawn}</span>}
              <span className="text-center" style={{ color: "#ef4444" }}>{row.lost}</span>
              <span className="text-right font-black text-[11px] pr-1" style={{ color: "var(--brand)" }}>{row.pts}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

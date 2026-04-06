"use client";

import { useState, useEffect } from "react";

/* ─── Sport / League 구성 ─── */
const SPORTS = [
  { id: "soccer",     icon: "⚽", label: "축구" },
  { id: "baseball",   icon: "⚾", label: "야구" },
  { id: "basketball", icon: "🏀", label: "농구" },
  { id: "volleyball", icon: "🏐", label: "배구" },
  { id: "hockey",     icon: "🏒", label: "하키" },
];

const LEAGUE_TABS: Record<string, { id: string; label: string }[]> = {
  soccer: [
    { id: "EPL", label: "EPL" },
    { id: "라리가", label: "라리가" },
    { id: "분데스리가", label: "분데스리가" },
    { id: "세리에A", label: "세리에A" },
    { id: "리그앙", label: "리그앙" },
    { id: "에레디비시", label: "에레디비시" },
  ],
  baseball: [
    { id: "KBO", label: "KBO" },
    { id: "퓨처스", label: "퓨처스" },
    { id: "MLB(AL)", label: "MLB(AL)" },
    { id: "MLB(NL)", label: "MLB(NL)" },
    { id: "NPB(CL)", label: "NPB(CL)" },
    { id: "NPB(PL)", label: "NPB(PL)" },
  ],
  basketball: [
    { id: "NBA 동부", label: "NBA 동부" },
    { id: "NBA 서부", label: "NBA 서부" },
    { id: "KBL", label: "KBL" },
    { id: "WKBL", label: "WKBL" },
  ],
  volleyball: [
    { id: "V리그(남)", label: "V리그(남)" },
    { id: "V리그(여)", label: "V리그(여)" },
  ],
  hockey: [
    { id: "NHL", label: "NHL" },
    { id: "KHL", label: "KHL" },
  ],
};

/* ─── 타입 ─── */
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

interface LeagueStandings {
  sport: string;
  league: string;
  division?: string;
  columns: string[];
  teams: TeamRow[];
}

/* 무승부 없는 리그 */
const NO_DRAW_SPORTS = new Set(["baseball", "basketball"]);

export default function StandingsPage() {
  const [activeSport, setActiveSport] = useState("soccer");
  const [activeLeague, setActiveLeague] = useState("EPL");
  const [activeDivision, setActiveDivision] = useState("");
  const [allData, setAllData] = useState<LeagueStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    fetch("/api/standings")
      .then(r => r.json())
      .then(data => {
        setAllData(data.standings || []);
        setUpdatedAt(data.updatedAt || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const leagues = LEAGUE_TABS[activeSport] || [];
  const filtered = allData.filter(s => s.league === activeLeague && s.teams.length > 0);
  const hideDraw = NO_DRAW_SPORTS.has(activeSport);

  // division 목록 추출
  const divisions = filtered.map(s => s.division).filter((d): d is string => !!d);
  const hasDivisions = divisions.length > 1;
  const displayData = hasDivisions && activeDivision
    ? filtered.filter(s => s.division === activeDivision)
    : filtered;

  const handleSportChange = (sportId: string) => {
    setActiveSport(sportId);
    const first = LEAGUE_TABS[sportId]?.[0];
    if (first) setActiveLeague(first.id);
    setActiveDivision("");
  };

  const handleLeagueChange = (leagueId: string) => {
    setActiveLeague(leagueId);
    setActiveDivision("");
  };

  return (
    <>
      <div className="mt-2 space-y-3">

        {/* ── 종목 카드 탭 ── */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${SPORTS.length}, 1fr)` }}>
          {SPORTS.map((sport) => (
            <button
              key={sport.id}
              onClick={() => handleSportChange(sport.id)}
              className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-200 cursor-pointer"
              style={{
                background: activeSport === sport.id ? "var(--brand)" : "var(--surface)",
                border: `1px solid ${activeSport === sport.id ? "var(--brand)" : "var(--border)"}`,
              }}
              onMouseEnter={e => {
                if (activeSport !== sport.id) {
                  (e.currentTarget as HTMLElement).style.background = "var(--brand)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                  e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "#fff");
                }
              }}
              onMouseLeave={e => {
                if (activeSport !== sport.id) {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "var(--text-secondary)");
                }
              }}
            >
              <span className="text-[20px]">{sport.icon}</span>
              <span
                data-label=""
                className="text-[11px] font-bold transition-colors"
                style={{ color: activeSport === sport.id ? "#fff" : "var(--text-secondary)" }}
              >{sport.label}</span>
            </button>
          ))}
        </div>

        {/* ── 리그 카드 탭 ── */}
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${leagues.length}, 1fr)` }}>
          {leagues.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleLeagueChange(tab.id)}
              className="rounded-lg px-1 py-2 text-[13px] font-bold transition-all duration-200 cursor-pointer"
              style={{
                background: activeLeague === tab.id ? "var(--brand)" : "var(--surface)",
                color: activeLeague === tab.id ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${activeLeague === tab.id ? "var(--brand)" : "var(--border)"}`,
              }}
              onMouseEnter={e => {
                if (activeLeague !== tab.id) {
                  (e.currentTarget as HTMLElement).style.background = "var(--brand)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                  (e.currentTarget as HTMLElement).style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (activeLeague !== tab.id) {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 디비전 탭 ── */}
        {hasDivisions && (
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveDivision("")}
              className="rounded-lg px-3 py-1.5 text-[12px] font-bold whitespace-nowrap shrink-0"
              style={{
                background: !activeDivision ? "var(--brand)" : "var(--surface)",
                color: !activeDivision ? "#fff" : "var(--text-secondary)",
                border: `1px solid ${!activeDivision ? "var(--brand)" : "var(--border)"}`,
              }}
            >전체</button>
            {divisions.map(div => (
              <button
                key={div}
                onClick={() => setActiveDivision(div)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-bold whitespace-nowrap shrink-0"
                style={{
                  background: activeDivision === div ? "var(--brand)" : "var(--surface)",
                  color: activeDivision === div ? "#fff" : "var(--text-secondary)",
                  border: `1px solid ${activeDivision === div ? "var(--brand)" : "var(--border)"}`,
                }}
              >{div}</button>
            ))}
          </div>
        )}

        {/* ── 로딩 ── */}
        {loading && (
          <div className="py-12 text-center">
            <div className="w-8 h-8 rounded-full mx-auto mb-2 animate-spin" style={{ border: "3px solid var(--border)", borderTopColor: "var(--brand)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>순위 데이터 불러오는 중...</p>
          </div>
        )}

        {/* ── 데이터 없음 ── */}
        {!loading && displayData.length === 0 && (
          <div className="py-12 text-center" style={{ color: "var(--text-secondary)" }}>
            <p className="text-sm">해당 리그 데이터가 없습니다.</p>
          </div>
        )}

        {/* ── 순위표 (디비전별) ── */}
        {displayData.map((league, li) => (
          <div key={`${league.league}-${league.division ?? li}`} className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="px-3 py-2" style={{ background: "var(--brand)" }}>
              <span className="text-white text-[13px] font-bold">
                {league.division ? `${league.league} — ${league.division}` : league.league}
              </span>
            </div>

            {/* 헤더 */}
            <div
              className="grid text-[11px] font-bold px-2 py-1.5"
              style={{
                gridTemplateColumns: hideDraw
                  ? "28px 1fr 36px 36px 36px 48px"
                  : "28px 1fr 36px 36px 36px 36px 48px",
                background: "var(--bg)",
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span className="text-center">#</span>
              <span>팀</span>
              <span className="text-center">경기</span>
              <span className="text-center">승</span>
              {!hideDraw && <span className="text-center">무</span>}
              <span className="text-center">패</span>
              <span className="text-center font-black" style={{ color: "var(--brand)" }}>승점</span>
            </div>

            {/* 데이터 행 */}
            {league.teams.map((team, i) => (
              <div
                key={`${team.team}-${i}`}
                className="grid items-center text-[12px] px-2 py-2"
                style={{
                  gridTemplateColumns: hideDraw
                    ? "28px 1fr 36px 36px 36px 48px"
                    : "28px 1fr 36px 36px 36px 36px 48px",
                  background: i % 2 === 1 ? "var(--bg)" : "var(--surface)",
                  borderBottom: i < league.teams.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <span
                  className="text-center font-black text-[12px] w-5 h-5 flex items-center justify-center rounded-full mx-auto"
                  style={team.rank <= 4
                    ? { background: "var(--brand)", color: "#fff" }
                    : { color: "var(--text-secondary)" }
                  }
                >{team.rank}</span>
                <span className="font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                  {team.logo && (
                    <img
                      src={team.logo}
                      alt=""
                      width={20}
                      height={20}
                      className="w-5 h-5 object-contain shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  {team.team}
                </span>
                <span className="text-center" style={{ color: "var(--text-secondary)" }}>{team.played}</span>
                <span className="text-center font-bold" style={{ color: "#22c55e" }}>{team.won}</span>
                {!hideDraw && <span className="text-center" style={{ color: "var(--text-secondary)" }}>{team.drawn}</span>}
                <span className="text-center" style={{ color: "#ef4444" }}>{team.lost}</span>
                <span className="text-center font-black text-[14px]" style={{ color: "var(--brand)" }}>{team.pts}</span>
              </div>
            ))}
          </div>
        ))}

        {/* 업데이트 시간 */}
        {updatedAt && (
          <p className="text-[10px] text-right px-1" style={{ color: "var(--text-secondary)" }}>
            마지막 업데이트: {new Date(updatedAt).toLocaleString("ko-KR")}
          </p>
        )}

      </div>
    </>
  );
}

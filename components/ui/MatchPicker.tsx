"use client";

import { useState, useEffect } from "react";

interface StandingsTeam {
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
  teams: StandingsTeam[];
}

interface PickResult {
  sport: string;
  league: string;
  homeTeam: string;
  homeLogo: string;
  homeRecord: string;
  awayTeam: string;
  awayLogo: string;
  awayRecord: string;
}

interface Props {
  onPick: (result: PickResult) => void;
  onClose: () => void;
}

function formatRecord(t: StandingsTeam, sport: string): string {
  if (sport === "soccer") return `${t.rank}위 ${t.won}승 ${t.drawn}무 ${t.lost}패 (${t.pts}pts)`;
  return `${t.rank}위 ${t.won}승 ${t.lost}패`;
}

export default function MatchPicker({ onPick, onClose }: Props) {
  const [standings, setStandings] = useState<LeagueStandings[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState<LeagueStandings | null>(null);
  const [homeTeam, setHomeTeam] = useState<StandingsTeam | null>(null);
  const [awayTeam, setAwayTeam] = useState<StandingsTeam | null>(null);
  const [step, setStep] = useState<"league" | "home" | "away" | "confirm">("league");

  useEffect(() => {
    fetch("/api/standings")
      .then(r => r.json())
      .then(data => setStandings(data.standings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectLeague = (lg: LeagueStandings) => {
    setSelectedLeague(lg);
    setHomeTeam(null);
    setAwayTeam(null);
    setStep("home");
  };

  const selectHome = (t: StandingsTeam) => {
    setHomeTeam(t);
    setStep("away");
  };

  const selectAway = (t: StandingsTeam) => {
    setAwayTeam(t);
    setStep("confirm");
  };

  const confirm = () => {
    if (!selectedLeague || !homeTeam || !awayTeam) return;
    onPick({
      sport: selectedLeague.sport,
      league: selectedLeague.league,
      homeTeam: homeTeam.team,
      homeLogo: homeTeam.logo,
      homeRecord: formatRecord(homeTeam, selectedLeague.sport),
      awayTeam: awayTeam.team,
      awayLogo: awayTeam.logo,
      awayRecord: formatRecord(awayTeam, selectedLeague.sport),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" style={{ background: "var(--surface)" }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
            {step === "league" && "리그 선택"}
            {step === "home" && `${selectedLeague?.league} - 홈팀 선택`}
            {step === "away" && `${selectedLeague?.league} - 원정팀 선택`}
            {step === "confirm" && "경기 확인"}
          </h2>
          <div className="flex items-center gap-2">
            {step !== "league" && (
              <button onClick={() => setStep(step === "confirm" ? "away" : step === "away" ? "home" : "league")} className="text-[11px] font-bold px-2 py-1 rounded" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                이전
              </button>
            )}
            <button onClick={onClose} className="text-lg" style={{ color: "var(--text-secondary)" }}>✕</button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>}

          {/* 리그 선택 */}
          {step === "league" && !loading && (
            <div className="grid grid-cols-2 gap-2">
              {standings.map((lg, i) => (
                <button
                  key={`${lg.league}-${lg.division || i}`}
                  onClick={() => selectLeague(lg)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors hover:opacity-80"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <span className="text-lg">{lg.sport === "soccer" ? "⚽" : lg.sport === "baseball" ? "⚾" : lg.sport === "basketball" ? "🏀" : lg.sport === "volleyball" ? "🏐" : lg.sport === "hockey" ? "🏒" : "🏅"}</span>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{lg.league}</p>
                    {lg.division && <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{lg.division}</p>}
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{lg.teams.length}팀</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 홈팀/원정팀 선택 */}
          {(step === "home" || step === "away") && selectedLeague && (
            <div className="flex flex-col gap-1">
              {selectedLeague.teams
                .filter(t => step === "away" ? t.team !== homeTeam?.team : true)
                .map(t => (
                <button
                  key={t.team}
                  onClick={() => step === "home" ? selectHome(t) : selectAway(t)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80 text-left"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  {t.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={t.logo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>{t.rank}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{t.team}</p>
                    <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{formatRecord(t, selectedLeague.sport)}</p>
                  </div>
                  <span className="text-[11px] font-bold shrink-0" style={{ color: "var(--brand)" }}>{t.rank}위</span>
                </button>
              ))}
            </div>
          )}

          {/* 확인 */}
          {step === "confirm" && homeTeam && awayTeam && selectedLeague && (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-[13px] font-bold" style={{ color: "var(--brand)" }}>{selectedLeague.league}</p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  {homeTeam.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={homeTeam.logo} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>{homeTeam.team[0]}</span>
                  )}
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{homeTeam.team}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{formatRecord(homeTeam, selectedLeague.sport)}</p>
                </div>
                <span className="text-lg font-black" style={{ color: "var(--text-primary)" }}>VS</span>
                <div className="flex flex-col items-center gap-1">
                  {awayTeam.logo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={awayTeam.logo} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <span className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>{awayTeam.team[0]}</span>
                  )}
                  <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{awayTeam.team}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{formatRecord(awayTeam, selectedLeague.sport)}</p>
                </div>
              </div>
              <button onClick={confirm} className="w-full py-2.5 rounded-lg text-sm font-bold text-white mt-2" style={{ background: "var(--brand)" }}>
                이 경기로 분석 작성하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

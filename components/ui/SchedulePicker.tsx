"use client";

import { useState, useEffect } from "react";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀",
  volleyball: "🏐", hockey: "🏒", esports: "🎮", ufc: "🥊", lol: "🏆",
};

const SPORT_TABS = [
  { id: "soccer", label: "축구", emoji: "⚽" },
  { id: "baseball", label: "야구", emoji: "⚾" },
  { id: "basketball", label: "농구", emoji: "🏀" },
  { id: "hockey", label: "하키", emoji: "🏒" },
];

interface ScheduleEvent {
  date: string;
  homeTeam: string;
  homeTeamEn: string;
  homeLogo: string;
  homeRecord: string;
  awayTeam: string;
  awayTeamEn: string;
  awayLogo: string;
  awayRecord: string;
  league: string;
  sport: string;
}

interface LeagueInfo {
  id: string;
  sport: string;
  league: string;
  name: string;
}

interface PickResult {
  sport: string;
  league: string;
  matchTime: string;
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

function formatDate(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${month}/${day}(${dow}) ${hour}:${min}`;
}

function formatDateGroup(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${month}월 ${day}일 (${dow})`;
}

export default function SchedulePicker({ onPick, onClose }: Props) {
  const [leagues, setLeagues] = useState<LeagueInfo[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState("soccer");
  const [selectedLeague, setSelectedLeague] = useState("");

  useEffect(() => {
    fetch("/api/schedule")
      .then(r => r.json())
      .then(data => {
        setLeagues(data.leagues || []);
        setEvents(data.events || []);
        // 첫 번째 종목의 첫 번째 리그 자동 선택
        const soccerLeagues = (data.leagues || []).filter((l: LeagueInfo) => l.sport === "soccer");
        if (soccerLeagues.length > 0) setSelectedLeague(soccerLeagues[0].league);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 종목 변경 시 첫 번째 리그 자동 선택
  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    const sportLeagues = leagues.filter(l => l.sport === sport);
    setSelectedLeague(sportLeagues.length > 0 ? sportLeagues[0].league : "");
  };

  // 현재 종목의 리그 목록
  const currentLeagues = leagues.filter(l => l.sport === selectedSport);

  // 필터링된 경기
  const filtered = selectedLeague
    ? events.filter(e => e.league === selectedLeague)
    : events.filter(e => e.sport === selectedSport);

  // 날짜별 그룹
  const grouped: Record<string, ScheduleEvent[]> = {};
  for (const e of filtered) {
    const d = new Date(e.date);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(e);
  }

  const handleSelect = (e: ScheduleEvent) => {
    const d = new Date(e.date);
    onPick({
      sport: e.sport,
      league: e.league,
      matchTime: d.toISOString(),
      homeTeam: e.homeTeam,
      homeLogo: e.homeLogo,
      homeRecord: e.homeRecord,
      awayTeam: e.awayTeam,
      awayLogo: e.awayLogo,
      awayRecord: e.awayRecord,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl" style={{ background: "var(--surface)" }} onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>📅 다음 일정에서 경기 선택</h2>
          <button onClick={onClose} className="text-lg" style={{ color: "var(--text-secondary)" }}>✕</button>
        </div>

        {/* 대분류: 종목 */}
        <div className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {SPORT_TABS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSportChange(s.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold transition-colors"
              style={{
                color: selectedSport === s.id ? "var(--brand)" : "var(--text-secondary)",
                borderBottom: selectedSport === s.id ? "2px solid var(--brand)" : "2px solid transparent",
              }}
            >
              <span>{s.emoji}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* 중분류: 리그 */}
        <div className="flex gap-1.5 px-3 py-2 overflow-x-auto shrink-0" style={{ borderBottom: "1px solid var(--border)", scrollbarWidth: "none" }}>
          {currentLeagues.map(l => (
            <button
              key={l.id}
              onClick={() => setSelectedLeague(l.league)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
              style={{
                background: selectedLeague === l.league ? "var(--brand)" : "var(--bg)",
                color: selectedLeague === l.league ? "#fff" : "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* 경기 목록 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              <div className="w-6 h-6 rounded-full mx-auto mb-2 animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
              일정 불러오는 중...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>예정된 경기가 없습니다.</div>
          ) : (
            Object.entries(grouped).map(([dateKey, dayEvents]) => (
              <div key={dateKey} className="mb-4">
                <p className="text-[12px] font-bold mb-2 px-1" style={{ color: "var(--brand)" }}>
                  {formatDateGroup(dayEvents[0].date)}
                </p>
                <div className="flex flex-col gap-1">
                  {dayEvents.map((evt, i) => (
                    <button
                      key={`${dateKey}-${i}`}
                      onClick={() => handleSelect(evt)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:opacity-80"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    >
                      <span className="text-lg shrink-0">{SPORT_EMOJI[evt.sport] || "🏅"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--brand)", color: "#fff" }}>{evt.league}</span>
                          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{formatDate(evt.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {evt.homeLogo && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={evt.homeLogo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                          )}
                          <span className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{evt.homeTeam}</span>
                          <span className="text-[11px] opacity-50">vs</span>
                          {evt.awayLogo && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={evt.awayLogo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                          )}
                          <span className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{evt.awayTeam}</span>
                        </div>
                        {(evt.homeRecord || evt.awayRecord) && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                            {evt.homeRecord}{evt.homeRecord && evt.awayRecord && " · "}{evt.awayRecord}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

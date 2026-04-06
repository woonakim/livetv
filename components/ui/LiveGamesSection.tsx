"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀",
  volleyball: "🏐", hockey: "🏒", esports: "🎮", ufc: "🥊", lol: "🏆",
};

interface LiveMatch {
  id: string;
  sport: string;
  league: string;
  date: string;
  time: string;
  home: string;
  away: string;
  isLive: boolean;
  thumbnail?: string | null;
}

function TeamLogo({ name, logoMap, size = 16, enabled = true }: { name: string; logoMap: Record<string, string>; size?: number; enabled?: boolean }) {
  if (!enabled) return null;
  const logo = logoMap[name];
  if (!logo) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`${logo}?v=2`} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
}

export default function LiveGamesSection({ layout, startFrom = 0, maxCount, filter, title, initialCount, loadMoreCount = 10 }: { layout: "desktop" | "mobile"; startFrom?: number; maxCount?: number; filter?: "live" | "waiting"; title?: string; initialCount?: number; loadMoreCount?: number }) {
  const [games, setGames] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(initialCount ?? 999);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [logoEnabled, setLogoEnabled] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoMain ?? true)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/sports-live")
      .then(r => r.json())
      .then(data => {
        const live = data.live || [];
        const waiting = data.waiting || [];
        setGames([...live, ...waiting]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 무한 스크롤
  useEffect(() => {
    if (!initialCount) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(prev => prev + loadMoreCount);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [initialCount, loadMoreCount, games.length]);

  const allLive = games.filter(g => g.isLive);
  const allWaiting = games.filter(g => !g.isLive);
  const baseList = filter === "live" ? allLive : filter === "waiting" ? allWaiting : [...allLive, ...allWaiting];
  const sliced = maxCount ? baseList.slice(startFrom, startFrom + maxCount) : baseList.slice(startFrom);
  const displayList = sliced.slice(0, visibleCount);
  const hasMore = displayList.length < sliced.length;
  const liveGames = displayList.filter(g => g.isLive);
  const waitingGames = displayList.filter(g => !g.isLive);
  const cacheBust = Math.floor(Date.now() / 300000);

  // ── 데스크탑: 중계페이지와 동일한 테이블 형태 ──
  if (layout === "desktop") {
    // startFrom 사용 시 데이터 없으면 렌더링 안 함
    if (startFrom > 0 && !loading && sliced.length === 0) return null;
    return (
      <div className="rounded-lg overflow-hidden shadow-sm" style={{ background: "var(--surface)", border: "1px solid #f3f4f6" }}>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: filter === "waiting" ? "#919191" : "var(--brand)" }}>
          <span className="text-white text-[13px] font-bold">{title || "🔴 중계 라이브 목록"}</span>
          <Link href="/broadcast" className="text-white/80 text-[11px] font-bold hover:text-white">
            더보기 →
          </Link>
        </div>

        {/* 테이블 헤더 */}
        <div className="hidden lg:grid items-center gap-2 px-2 py-1.5 text-[11px] font-bold"
          style={{ gridTemplateColumns: "32px 68px 80px 100px 1fr 60px", background: "var(--bg)", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
          <div className="text-center">종목</div>
          <div className="text-center">미리보기</div>
          <div className="text-center">리그</div>
          <div className="text-center">경기시간</div>
          <div className="text-center">경기명</div>
          <div className="text-center">상태</div>
        </div>

        {loading ? (
          <div className="py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>경기 정보 불러오는 중...</div>
        ) : sliced.length === 0 ? (
          startFrom > 0 ? null : <div className="py-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>현재 중계 경기가 없습니다.</div>
        ) : (
          <>
            {liveGames.map((game, idx) => (
              <Link key={game.id} href={`/broadcast?match=${encodeURIComponent(game.id)}`}
                className="grid items-center gap-2 px-2 h-[48px] transition-colors hover:opacity-80"
                style={{ gridTemplateColumns: "32px 68px 80px 100px 1fr 60px", background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)" }}>
                <div className="text-center text-[20px]">{SPORT_EMOJI[game.sport] ?? "🏅"}</div>
                <div className="w-[68px] h-[39px] rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#111" }}>
                  {game.thumbnail ? (
                    <img src={`${game.thumbnail}?t=${cacheBust}`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[16px]">{SPORT_EMOJI[game.sport] ?? "🏅"}</span>
                  )}
                </div>
                <div className="text-[11px] font-bold text-center truncate" style={{ color: "var(--text-primary)" }}>{game.league}</div>
                <div className="text-[12px] font-bold text-center" style={{ color: "var(--brand)" }}>{game.date} {game.time}</div>
                <div className="text-[13px] font-bold truncate px-2 flex items-center gap-1" style={{ color: "var(--text-primary)" }}><TeamLogo name={game.home} logoMap={logoMap} enabled={logoEnabled} />{game.home}{game.away && <> <span className="opacity-60">vs</span> <TeamLogo name={game.away} logoMap={logoMap} enabled={logoEnabled} />{game.away}</>}</div>
                <div className="flex justify-center">
                  <span className="badge-live text-[9px]">● LIVE</span>
                </div>
              </Link>
            ))}
            {waitingGames.map((game, idx) => (
              <Link key={game.id} href={`/broadcast?match=${encodeURIComponent(game.id)}`}
                className="grid items-center gap-2 px-2 h-[48px] transition-colors hover:opacity-80"
                style={{ gridTemplateColumns: "32px 68px 80px 100px 1fr 60px", background: (liveGames.length + idx) % 2 === 1 ? "var(--bg)" : "var(--surface)" }}>
                <div className="text-center text-[20px] opacity-40">{SPORT_EMOJI[game.sport] ?? "🏅"}</div>
                <div className="w-[68px] h-[39px] rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#222" }}>
                  <span className="text-white/30 text-[14px]">{SPORT_EMOJI[game.sport] ?? "🏅"}</span>
                </div>
                <div className="text-[11px] font-bold text-center truncate" style={{ color: "var(--text-secondary)" }}>{game.league}</div>
                <div className="text-[12px] font-bold text-center" style={{ color: "var(--text-secondary)" }}>{game.date} {game.time}</div>
                <div className="text-[13px] font-bold truncate px-2 flex items-center gap-1" style={{ color: "var(--text-secondary)" }}><TeamLogo name={game.home} logoMap={logoMap} enabled={logoEnabled} />{game.home}{game.away && <> <span className="opacity-60">vs</span> <TeamLogo name={game.away} logoMap={logoMap} enabled={logoEnabled} />{game.away}</>}</div>
                <div className="flex justify-center">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#919191", color: "#fff" }}>대기</span>
                </div>
              </Link>
            ))}
          </>
        )}
        {hasMore && (
          <div ref={loadMoreRef} className="py-3 text-center">
            <div className="w-5 h-5 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
          </div>
        )}
      </div>
    );
  }

  // ── 모바일: 가로 슬라이더 카드 (제공된 HTML 서식) ──
  if (loading) {
    return <div className="py-4 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>;
  }
  if (liveGames.length === 0 && waitingGames.length === 0) {
    return <div className="py-4 text-center text-sm px-3" style={{ color: "var(--text-secondary)" }}>현재 중계 경기가 없습니다.</div>;
  }

  const allCards = [...liveGames, ...waitingGames];

  return (
    <div className="overflow-hidden px-2 pb-3">
      <div className="overflow-x-auto flex gap-1" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
        {allCards.map((game) => (
          <Link
            key={game.id}
            href={`/broadcast?match=${encodeURIComponent(game.id)}`}
            className="snap-start flex-shrink-0 py-1"
            style={{ width: 155 }}
          >
            <div className="rounded-lg p-2 flex flex-col gap-[2px] h-full"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {/* 썸네일 */}
              <div className="relative w-full rounded-lg overflow-hidden mb-1" style={{ height: 85 }}>
                {game.isLive && game.thumbnail ? (
                  <img src={`${game.thumbnail}?t=${cacheBust}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: game.isLive ? "linear-gradient(135deg, #1e293b, #0f172a)" : "linear-gradient(135deg, #334155, #1e293b)" }}>
                    <span className={`text-3xl ${game.isLive ? "" : "opacity-40"}`}>{SPORT_EMOJI[game.sport] ?? "🏅"}</span>
                  </div>
                )}
                {game.isLive && (
                  <span className="absolute top-1 left-1 badge-live text-[8px]">● LIVE</span>
                )}
                {!game.isLive && (
                  <span className="absolute top-1 left-1 text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: "#919191", color: "#fff" }}>대기</span>
                )}
              </div>

              {/* 리그명 */}
              <div className="text-[13px] font-extrabold truncate" style={{ color: "var(--brand)" }}>{game.league}</div>

              {/* 경기시간 */}
              <div className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                {game.date} {game.time}
              </div>

              {/* 홈/원정 */}
              <div className="flex flex-col gap-[3px] mt-1">
                {game.away ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-white" style={{ background: "var(--brand)" }}>H</span>
                      <TeamLogo name={game.home} logoMap={logoMap} enabled={logoEnabled} size={16} />
                      <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)", maxWidth: 120 }}>{game.home}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-white" style={{ background: "#64748b" }}>A</span>
                      <TeamLogo name={game.away} logoMap={logoMap} enabled={logoEnabled} size={16} />
                      <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)", maxWidth: 120 }}>{game.away}</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <TeamLogo name={game.home} logoMap={logoMap} enabled={logoEnabled} size={16} />
                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)", maxWidth: 120 }}>{game.home}</p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

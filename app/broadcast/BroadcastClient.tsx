"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import type { SportsLiveMatch } from "@/lib/sports-live";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽",
  baseball: "⚾",
  basketball: "🏀",
  volleyball: "🏐",
  hockey: "🏒",
  esports: "🎮",
  ufc: "🥊",
  lol: "🏆",
};

function TeamLogo({ name, logoMap, size = 18, enabled = true }: { name: string; logoMap: Record<string, string>; size?: number; enabled?: boolean }) {
  if (!enabled) return null;
  const logo = logoMap[name];
  if (!logo) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`${logo}?v=2`} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
}

function MatchLabel({ home, away, logoMap, className, style, logoEnabled = true }: { home: string; away: string; logoMap: Record<string, string>; className?: string; style?: React.CSSProperties; logoEnabled?: boolean }) {
  if (!away) {
    return (
      <span className={`flex items-center gap-1 ${className ?? ""}`} style={style}>
        <TeamLogo name={home} logoMap={logoMap} enabled={logoEnabled} />
        <span className="truncate">{home}</span>
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1 ${className ?? ""}`} style={style}>
      <TeamLogo name={home} logoMap={logoMap} enabled={logoEnabled} />
      <span className="truncate">{home}</span>
      <span className="opacity-60 mx-0.5">vs</span>
      <TeamLogo name={away} logoMap={logoMap} enabled={logoEnabled} />
      <span className="truncate">{away}</span>
    </span>
  );
}

interface ChannelSlot {
  match: SportsLiveMatch;
  streamIdx: number;
}

interface BroadcastClientProps {
  initialSport: string;
  initialLiveGames: SportsLiveMatch[];
  initialWaitingGames: SportsLiveMatch[];
  autoMatchId?: string;
}

const MOBILE_PLAYER_ASPECT = "aspect-[16/7.8] sm:aspect-video";

export default function BroadcastClient({
  initialSport,
  initialLiveGames,
  initialWaitingGames,
  autoMatchId,
}: BroadcastClientProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSport, setSelectedSport] = useState(initialSport);
  const [channelCount, setChannelCount] = useState<1 | 2 | 4>(1);
  const [timer, setTimer] = useState(60);
  const [liveGames, setLiveGames] = useState(initialLiveGames);
  const [waitingGames, setWaitingGames] = useState(initialWaitingGames);
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<(ChannelSlot | null)[]>([null]);
  const [liveVisibleCount, setLiveVisibleCount] = useState(20);
  const [waitVisibleCount, setWaitVisibleCount] = useState(20);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const liveEndRef = useRef<HTMLDivElement>(null);
  const waitEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  const [logoEnabled, setLogoEnabled] = useState(true);

  // 팀 로고맵 + 설정 로드
  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoBroadcast ?? true)).catch(() => {});
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (isMobile && channelCount !== 1) {
      setChannelCount(1);
    }
  }, [isMobile, channelCount]);

  // URL에서 match 파라미터가 있으면 자동으로 해당 경기 선택
  useEffect(() => {
    if (!autoMatchId) return;
    const allGames = [...initialLiveGames, ...initialWaitingGames];
    const found = allGames.find((g) => g.id === autoMatchId);
    if (found) {
      setChannels([{ match: found, streamIdx: 0 }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMatchId]);

  // 스포츠 필터 변경 시 페이징 리셋
  useEffect(() => {
    setLiveVisibleCount(20);
    setWaitVisibleCount(20);
  }, [selectedSport]);

  // 무한 스크롤: 라이브 목록
  useEffect(() => {
    const el = liveEndRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLiveVisibleCount((prev) => prev + 10);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [liveGames.length]);

  // 무한 스크롤: 대기 목록
  useEffect(() => {
    const el = waitEndRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setWaitVisibleCount((prev) => prev + 10);
      }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [waitingGames.length]);

  const fetchGames = useCallback(async () => {
    try {
      const sportParam = selectedSport === "all" ? "" : selectedSport;
      const res = await fetch(`/api/sports-live?sport=${sportParam}`);
      const data = await res.json();
      setLiveGames(data.live || []);
      setWaitingGames(data.waiting || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedSport]);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    setLoading(true);
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimer((s) => {
        if (s <= 1) {
          setLoading(true);
          fetchGames();
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [fetchGames]);

  useEffect(() => {
    setChannels((prev) => Array.from({ length: channelCount }, (_, i) => prev[i] ?? null));
  }, [channelCount]);

  const handleRefresh = () => {
    setTimer(60);
    setLoading(true);
    fetchGames();
  };

  const addToChannel = (match: SportsLiveMatch, slotIdx: number = -1) => {
    setChannels((prev) => {
      const next = [...prev];
      if (slotIdx >= 0 && slotIdx < next.length) {
        for (let i = 0; i < next.length; i++) {
          if (next[i]?.match.id === match.id) next[i] = null;
        }
        next[slotIdx] = { match, streamIdx: 0 };
        return next;
      }
      const existIdx = next.findIndex((c) => c?.match.id === match.id);
      if (existIdx >= 0) return next;
      const emptyIdx = next.findIndex((c) => c === null);
      if (emptyIdx >= 0) {
        next[emptyIdx] = { match, streamIdx: 0 };
      } else {
        next[next.length - 1] = { match, streamIdx: 0 };
      }
      return next;
    });
  };

  const removeChannel = (idx: number) => {
    setChannels((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
  };

  const filledCount = channels.filter(Boolean).length;
  const availableChannelOptions = isMobile
    ? [
        { label: "1채널", icon: "fa-desktop", count: 1 as const },
      ]
    : [
        { label: "1채널", icon: "fa-desktop", count: 1 as const },
        { label: "2채널", icon: "fa-columns", count: 2 as const },
        { label: "4채널", icon: "fa-th-large", count: 4 as const },
      ];

  return (
    <>
      {filledCount > 0 && (
        <section ref={playerRef} className="bg-black w-full sticky top-[56px] lg:top-[60px] z-40">
          {channelCount === 1 && (
            <PlayerSlot slot={channels[0]} index={0} onRemove={removeChannel} />
          )}
          {channelCount === 2 && isMobile && (
            <div className="flex flex-col gap-[2px] w-full bg-black">
              {channels.slice(0, 2).map((slot, i) => (
                <PlayerSlot key={i} slot={slot} index={i} onRemove={removeChannel} />
              ))}
            </div>
          )}
          {channelCount === 2 && !isMobile && (
            <div className="grid grid-cols-2 gap-[2px] w-full bg-black">
              {channels.slice(0, 2).map((slot, i) => (
                <PlayerSlot key={i} slot={slot} index={i} onRemove={removeChannel} />
              ))}
            </div>
          )}
          {channelCount === 4 && (
            <div className="grid grid-cols-2 gap-[2px] w-full bg-black">
              {channels.slice(0, 4).map((slot, i) => (
                <PlayerSlot key={i} slot={slot} index={i} onRemove={removeChannel} />
              ))}
            </div>
          )}
        </section>
      )}

      {filledCount > 0 && (
        <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-wrap">
            {channels.map((ch, i) => ch && (
              <span key={i} className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "var(--brand)", color: "#fff" }}>
                CH{i + 1}: {ch.match.home} vs {ch.match.away}
              </span>
            ))}
          </div>
          {channelCount === 1 && channels[0] && (
            <div className="shrink-0">
              <ShareButton matchId={channels[0].match.id} matchInfo={`${channels[0].match.league} · ${channels[0].match.home} vs ${channels[0].match.away}`} />
            </div>
          )}
        </div>
      )}

      <div className="border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <ul className={`grid h-[40px] ${availableChannelOptions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {availableChannelOptions.map((ch) => {
            const isActive = channelCount === ch.count;
            return (
              <li
                key={ch.label}
                onClick={() => setChannelCount(ch.count)}
                className="flex items-center justify-center gap-2 cursor-pointer text-[13px] font-bold transition-colors"
                style={{
                  color: isActive ? "var(--brand)" : "var(--text-secondary)",
                  borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                }}
              >
                <i className={`fas ${ch.icon} text-xs`} />
                <span>{ch.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className="grid gap-1.5 px-2 py-2"
        style={{ gridTemplateColumns: `repeat(${SPORT_CATEGORIES.length + 1}, 1fr)` }}
      >
        <button
          onClick={() => setSelectedSport("all")}
          className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-200 cursor-pointer"
          style={{
            background: selectedSport === "all" ? "var(--brand)" : "var(--surface)",
            border: `1px solid ${selectedSport === "all" ? "var(--brand)" : "var(--border)"}`,
          }}
          onMouseEnter={(e) => {
            if (selectedSport !== "all") {
              (e.currentTarget as HTMLElement).style.background = "var(--brand)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
              e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => el.style.color = "#fff");
            }
          }}
          onMouseLeave={(e) => {
            if (selectedSport !== "all") {
              (e.currentTarget as HTMLElement).style.background = "var(--surface)";
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => el.style.color = "var(--text-secondary)");
            }
          }}
        >
          <span className="text-[18px]">📺</span>
          <span data-label="" className="text-[11px] font-bold transition-colors" style={{ color: selectedSport === "all" ? "#fff" : "var(--text-secondary)" }}>전체</span>
        </button>
        {SPORT_CATEGORIES.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-200 cursor-pointer"
            style={{
              background: selectedSport === sport.id ? "var(--brand)" : "var(--surface)",
              border: `1px solid ${selectedSport === sport.id ? "var(--brand)" : "var(--border)"}`,
            }}
            onMouseEnter={(e) => {
              if (selectedSport !== sport.id) {
                (e.currentTarget as HTMLElement).style.background = "var(--brand)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)";
                e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => el.style.color = "#fff");
              }
            }}
            onMouseLeave={(e) => {
              if (selectedSport !== sport.id) {
                (e.currentTarget as HTMLElement).style.background = "var(--surface)";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach((el) => el.style.color = "var(--text-secondary)");
              }
            }}
          >
            <span className="text-[18px]">{sport.emoji}</span>
            <span data-label="" className="text-[11px] font-bold transition-colors" style={{ color: selectedSport === sport.id ? "#fff" : "var(--text-secondary)" }}>{sport.name}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <h1 className="text-[18px] font-bold" style={{ color: "var(--brand)" }}>
          중계 라이브 목록
          {!loading && <span className="text-[12px] font-normal ml-2" style={{ color: "var(--text-secondary)" }}>({liveGames.length}개 라이브)</span>}
        </h1>
        <div className="flex items-center gap-1 text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--brand)" }}>{timer}초</span> 후 또는
          <span className="cursor-pointer" style={{ color: "var(--brand)" }} onClick={handleRefresh}>클릭</span> 시
          <i className="fas fa-sync-alt text-xs ml-1" /> 새로고침
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>경기 정보 불러오는 중...</div>
      )}

      {!loading && liveGames.length > 0 && (
        <div className="rounded-lg overflow-hidden shadow-sm" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="hidden lg:grid items-center gap-2 px-2 py-2 text-[11px] font-bold" style={{ gridTemplateColumns: "32px 68px 80px 150px 1fr 120px", background: "var(--brand)", color: "#fff" }}>
            <div className="text-center">종목</div>
            <div className="text-center">스코어</div>
            <div className="text-center">리그</div>
            <div className="text-center">경기시간</div>
            <div className="text-center">경기명</div>
            <div className="text-right pr-2">채널</div>
          </div>
          <div className="lg:hidden flex items-center px-2 py-2 text-[11px] font-bold" style={{ background: "var(--brand)", color: "#fff" }}>
            <span className="text-[12px]">🔴 LIVE 중계 ({liveGames.length})</span>
          </div>

          {liveGames.slice(0, liveVisibleCount).map((game, idx) => {
            const playingSlots = channels.reduce<number[]>((acc, c, i) => {
              if (c?.match.id === game.id) acc.push(i);
              return acc;
            }, []);
            const isPlaying = playingSlots.length > 0;
            return (
              <div
                key={game.id}
                className="cursor-pointer transition-colors hover:opacity-90"
                style={{
                  background: isPlaying ? "rgba(14,165,233,0.08)" : idx % 2 === 1 ? "var(--surface-alt, #f4f4f4)" : "var(--surface)",
                  borderLeft: isPlaying ? "3px solid var(--brand)" : "3px solid transparent",
                }}
                onClick={() => addToChannel(game)}
              >
                <div className="hidden lg:grid items-center gap-2 h-[48px] px-2" style={{ gridTemplateColumns: "32px 68px 80px 150px 1fr 120px" }}>
                  <div className="text-center text-[20px]">{SPORT_EMOJI[game.sport] ?? "🏅"}</div>
                  <ThumbBox src={game.thumbnail} fallback={SPORT_EMOJI[game.sport] ?? "🏅"} className="w-[68px] h-[39px]" />
                  <div className="text-[11px] font-bold text-center truncate" style={{ color: "var(--text-primary)" }}>{game.league}</div>
                  <div className="text-[12px] font-bold text-center" style={{ color: "var(--brand)" }}>{game.date} {game.time}</div>
                  <MatchLabel home={game.home} away={game.away} logoMap={logoMap} logoEnabled={logoEnabled} className="text-[13px] font-bold truncate px-2" style={{ color: "var(--text-primary)" }} />
                  <div className="flex items-center justify-end gap-1 pr-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isPlaying
                      ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap" style={{ background: "#16a34a" }}>● 재생중</span>
                      : <span className="badge-live text-[9px] whitespace-nowrap">● LIVE</span>
                    }
                    <ChannelButtons count={isMobile ? 1 : channelCount} activeSlots={playingSlots} onSelect={(si) => addToChannel(game, si)} />
                  </div>
                </div>

                <div className="lg:hidden flex items-center gap-2 px-2 py-2">
                  <ThumbBox src={game.thumbnail} fallback={SPORT_EMOJI[game.sport] ?? "🏅"} className="w-[50px] h-[40px]" showLive />
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>{game.league}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{game.time}</span>
                    </div>
                    <MatchLabel home={game.home} away={game.away} logoMap={logoMap} logoEnabled={logoEnabled} className="text-[12px] font-bold truncate" style={{ color: "var(--text-primary)" }} />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isPlaying
                      ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap" style={{ background: "#16a34a" }}>● 재생중</span>
                      : <span className="badge-live text-[9px] whitespace-nowrap">● LIVE</span>
                    }
                    <ChannelButtons count={isMobile ? 1 : channelCount} activeSlots={playingSlots} onSelect={(si) => addToChannel(game, si)} />
                  </div>
                </div>
              </div>
            );
          })}
          {liveVisibleCount < liveGames.length && (
            <div ref={liveEndRef} className="py-3 text-center text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <div className="w-5 h-5 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
            </div>
          )}
        </div>
      )}

      {!loading && liveGames.length === 0 && (
        <div className="py-6 text-center text-sm rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          현재 라이브 중인 경기가 없습니다.
        </div>
      )}

      <div className="h-2" />

      {!loading && waitingGames.length > 0 && (
        <div className="rounded-lg overflow-hidden shadow-sm mb-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="hidden lg:grid items-center gap-2 px-2 py-2 text-[11px] font-bold" style={{ gridTemplateColumns: "32px 68px 80px 150px 1fr 120px", background: "#919191", color: "#fff" }}>
            <div className="text-center">종목</div>
            <div className="text-center">미리보기</div>
            <div className="text-center">리그</div>
            <div className="text-center">시작시간</div>
            <div className="text-center">경기명</div>
            <div className="text-right pr-2">상태</div>
          </div>
          <div className="lg:hidden flex items-center px-2 py-2 text-[11px] font-bold" style={{ background: "#919191", color: "#fff" }}>
            <span className="text-[12px]">⏳ 대기중 ({waitingGames.length})</span>
          </div>

          {waitingGames.slice(0, waitVisibleCount).map((game, idx) => (
            <div key={game.id} style={{ background: idx % 2 === 1 ? "var(--surface-alt, #f4f4f4)" : "var(--surface)" }}>
              <div className="hidden lg:grid items-center gap-2 h-[48px] px-2" style={{ gridTemplateColumns: "32px 68px 80px 150px 1fr 120px" }}>
                <div className="text-center text-[20px]">{SPORT_EMOJI[game.sport] ?? "🏅"}</div>
                <div className="w-[68px] h-[39px] rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#222" }}>
                  <span className="text-white/50 text-[10px] font-semibold">{game.league}</span>
                </div>
                <div className="text-[11px] font-bold text-center truncate" style={{ color: "var(--text-primary)" }}>{game.league}</div>
                <div className="text-[12px] font-bold text-center" style={{ color: "var(--text-secondary)" }}>{game.date} {game.time}</div>
                <MatchLabel home={game.home} away={game.away} logoMap={logoMap} logoEnabled={logoEnabled} className="text-[13px] font-bold truncate px-2" style={{ color: "var(--text-primary)" }} />
                <div className="flex items-center justify-end pr-2">
                  <span className="px-2 py-0.5 text-[11px] text-white rounded font-semibold" style={{ background: "#919191" }}>대기중</span>
                </div>
              </div>
              <div className="lg:hidden flex items-center gap-2 px-2 py-2">
                <div className="w-[50px] h-[40px] rounded overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "#333" }}>
                  <span className="text-white/40 text-[9px] font-semibold">{SPORT_EMOJI[game.sport] ?? "🏅"}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>{game.league}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{game.time}</span>
                  </div>
                  <MatchLabel home={game.home} away={game.away} logoMap={logoMap} logoEnabled={logoEnabled} className="text-[12px] font-bold truncate" style={{ color: "var(--text-primary)" }} />
                </div>
                <div className="shrink-0">
                  <span className="px-2 py-1 text-[11px] text-white rounded font-semibold" style={{ background: "#919191" }}>대기중</span>
                </div>
              </div>
            </div>
          ))}
          {waitVisibleCount < waitingGames.length && (
            <div ref={waitEndRef} className="py-3 text-center">
              <div className="w-5 h-5 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
            </div>
          )}
        </div>
      )}
    </>
  );
}


function ShareButton({ matchId, matchInfo }: { matchId: string; matchInfo: string }) {
  const [showModal, setShowModal] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/broadcast/share/${encodeURIComponent(matchId)}`;

    // 모바일(640px 이하)만 네이티브 공유, PC는 항상 클립보드 복사
    const isMobileDevice = window.innerWidth <= 640;
    if (isMobileDevice && navigator.share) {
      try {
        await navigator.share({ title: `라이브TV - ${matchInfo}`, url: shareUrl });
        return;
      } catch { /* 사용자 취소 */ }
    }

    // PC 또는 모바일 공유 실패 시: 클립보드 복사 + 모달
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
    } catch { /* fallback */ }
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all hover:opacity-80"
        style={{ background: "var(--brand)", color: "#fff" }}
        title="경기 공유하기"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        영상 공유하기
      </button>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div
            className="rounded-xl px-8 py-6 shadow-2xl text-center animate-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "var(--brand)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
            <p className="text-[15px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>링크 복사완료</p>
            <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>공유 링크가 클립보드에 복사되었습니다.</p>
          </div>
        </div>
      )}
    </>
  );
}

function PlayerSlot({
  slot,
  index,
  onRemove,
}: {
  slot: ChannelSlot | null;
  index: number;
  onRemove: (i: number) => void;
}) {
  if (!slot) {
    return (
      <div className="w-full aspect-video flex flex-col items-center justify-center gap-2 bg-black">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#1e293b" }}>
          <span className="text-white/30 text-xl">CH{index + 1}</span>
        </div>
        <p className="text-white/30 text-xs">경기를 선택하세요</p>
      </div>
    );
  }

  const { match } = slot;
  const playerSrc = match.streamUrl ?? "";

  return (
    <div className={`relative w-full bg-black ${MOBILE_PLAYER_ASPECT}`}>
      <iframe
        src={playerSrc}
        title={`broadcast-player-${index}`}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="origin"
      />

      <div className="absolute top-0 left-0 right-0 hidden sm:flex items-center justify-between px-2 py-1 pointer-events-none z-10" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>
            {match.isLive ? "LIVE" : "대기"}
          </span>
          <span className="text-white text-[11px] font-bold truncate">{match.league}</span>
          <span className="text-white/80 text-[11px] truncate">{match.home} vs {match.away}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          className="text-white/60 hover:text-white text-sm px-1 pointer-events-auto"
        >✕</button>
      </div>
      <div className="absolute top-1 right-1 sm:hidden flex items-center gap-1 max-w-[62%] px-1.5 py-1 rounded pointer-events-none z-10" style={{ background: "rgba(0,0,0,0.55)" }}>
        <span className="text-[8px] font-bold px-1 py-0.5 rounded text-white shrink-0" style={{ background: "#dc2626" }}>
          {match.isLive ? "LIVE" : "대기"}
        </span>
        <span className="text-white/90 text-[10px] font-semibold truncate">
          {match.league} · {match.home} vs {match.away}
        </span>
      </div>
      <div className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded text-white/60 pointer-events-none" style={{ background: "rgba(0,0,0,0.5)" }}>
        CH{index + 1}
      </div>
    </div>
  );
}

function ThumbBox({ src, fallback, className, showLive }: { src?: string | null; fallback: string; className?: string; showLive?: boolean }) {
  const [failed, setFailed] = useState(false);
  const hasSrc = src && !failed;
  const cacheBust = Math.floor(Date.now() / 30000);
  return (
    <div className={`rounded overflow-hidden shrink-0 flex items-center justify-center relative ${className ?? ""}`} style={{ background: "#111" }}>
      {hasSrc ? (
        <img
          src={`${src}?t=${cacheBust}`}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-white text-[16px]">{fallback}</span>
      )}
      {showLive && (
        <span className="absolute bottom-0 right-0 text-[7px] text-green-400 font-bold px-0.5" style={{ background: "rgba(0,0,0,0.7)" }}>LIVE</span>
      )}
    </div>
  );
}

function ChannelButtons({ count, activeSlots = [], onSelect }: { count: number; activeSlots?: number[]; onSelect: (idx: number) => void }) {
  return (
    <div className="flex h-[26px] rounded overflow-hidden" style={{ border: "1px solid #a8a8a8" }}>
      {Array.from({ length: count }, (_, i) => {
        const isActive = activeSlots.includes(i);
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onSelect(i); }}
            className="flex items-center justify-center w-[22px] text-[11px] font-bold text-white transition-all"
            style={{
              background: isActive ? "var(--brand)" : "#919191",
              borderRight: i < count - 1 ? "1px solid #a8a8a8" : "none",
            }}
          >{i + 1}</button>
        );
      })}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import type { YouTubeVideo } from "@/lib/youtube";
import { lookupTeamLogo } from "@/lib/team-name";

const PAGE_SIZE = 30;
const MAX_VIDEOS = 300; // 메모리 보호 상한

function SmallTeamLogo({ name, sport, logoMap, enabled }: { name: string; sport?: string; logoMap: Record<string, string>; enabled: boolean }) {
  if (!enabled) return null;
  const logo = lookupTeamLogo(logoMap, name, sport);
  if (!logo) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`${logo}?v=2`} alt={name} className="w-4 h-4 rounded-full object-cover shrink-0" />;
}

// 시점 라벨 (오늘/어제/이번 주/지난 주/그 이전)
function getDateBucket(publishedAt: number): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayMs = today.getTime();
  const dayMs = 86400000;
  const diffDays = Math.floor((todayMs - new Date(new Date(publishedAt).getFullYear(), new Date(publishedAt).getMonth(), new Date(publishedAt).getDate()).getTime()) / dayMs);
  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return "이번 주";
  if (diffDays < 14) return "지난 주";
  if (diffDays < 30) return "이번 달";
  return "이전";
}

export default function HighlightsPage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [logoEnabled, setLogoEnabled] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoYoutube ?? true)).catch(() => {});
  }, []);

  // sport 변경 시 첫 페이지 fetch
  useEffect(() => {
    setLoading(true);
    setVideos([]);
    setHasMore(true);
    fetch(`/api/highlights?sport=${selectedSport}&limit=${PAGE_SIZE}&offset=0`)
      .then((r) => r.json())
      .then((data: YouTubeVideo[]) => {
        const list = Array.isArray(data) ? data : [];
        setVideos(list);
        setHasMore(list.length === PAGE_SIZE);
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [selectedSport]);

  // 추가 로드 (자동 + 수동 공통)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || videos.length >= MAX_VIDEOS) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/highlights?sport=${selectedSport}&limit=${PAGE_SIZE}&offset=${videos.length}`);
      const data: YouTubeVideo[] = await res.json();
      const fresh = Array.isArray(data) ? data : [];
      // 중복 방지 (videoId 기준)
      const seen = new Set(videos.map(v => v.id));
      const merged = [...videos, ...fresh.filter(v => !seen.has(v.id))];
      setVideos(merged);
      setHasMore(fresh.length === PAGE_SIZE && merged.length < MAX_VIDEOS);
    } catch {} finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, selectedSport, videos]);

  // IntersectionObserver — sentinel이 보이면 자동 로드
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: "300px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  return (
    <>
      <div className="space-y-4">
        <div className="px-1 pt-1">
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>🎬 하이라이트</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>종목별 최신 경기 하이라이트</p>
        </div>

        {/* 종목 탭 (카드형) */}
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${SPORT_CATEGORIES.length + 1}, 1fr)` }}
        >
          <button
            onClick={() => setSelectedSport("all")}
            className="flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-all duration-200 cursor-pointer"
            style={{
              background: selectedSport === "all" ? "var(--brand)" : "var(--surface)",
              border: `1px solid ${selectedSport === "all" ? "var(--brand)" : "var(--border)"}`,
            }}
            onMouseEnter={e => { if (selectedSport !== "all") { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)"; e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "#fff"); }}}
            onMouseLeave={e => { if (selectedSport !== "all") { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "var(--text-secondary)"); }}}
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
              onMouseEnter={e => { if (selectedSport !== sport.id) { (e.currentTarget as HTMLElement).style.background = "var(--brand)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--brand)"; e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "#fff"); }}}
              onMouseLeave={e => { if (selectedSport !== sport.id) { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; e.currentTarget.querySelectorAll<HTMLElement>("[data-label]").forEach(el => el.style.color = "var(--text-secondary)"); }}}
            >
              <span className="text-[18px]">{sport.emoji}</span>
              <span data-label="" className="text-[11px] font-bold transition-colors" style={{ color: selectedSport === sport.id ? "#fff" : "var(--text-secondary)" }}>{sport.name}</span>
            </button>
          ))}
        </div>

        {/* 영상 그리드 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-lg overflow-hidden animate-pulse" style={{ border: "1px solid var(--border)" }}>
                <div className="aspect-video" style={{ background: "var(--border)" }} />
                <div className="p-2.5 space-y-2" style={{ background: "var(--surface)" }}>
                  <div className="h-3 rounded" style={{ background: "var(--border)" }} />
                  <div className="h-3 rounded w-2/3" style={{ background: "var(--border)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--text-secondary)" }}>
            <i className="fas fa-video-slash text-3xl mb-3 block" />
            <p className="text-sm">영상을 불러올 수 없습니다</p>
          </div>
        ) : (
          <>
            {/* 시점 버킷별 그룹 렌더링 */}
            {(() => {
              const groups: { bucket: string; items: YouTubeVideo[] }[] = [];
              let currentBucket = "";
              for (const v of videos) {
                const b = getDateBucket(v.publishedAt);
                if (b !== currentBucket) {
                  groups.push({ bucket: b, items: [] });
                  currentBucket = b;
                }
                groups[groups.length - 1].items.push(v);
              }
              return groups.map((g) => (
                <div key={g.bucket + g.items[0]?.id} className="space-y-2">
                  <div className="flex items-center gap-2 mt-2">
                    <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{g.bucket}</h2>
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{g.items.length}개</span>
                    <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {g.items.map((video) => (
                      <button
                        key={video.id}
                        onClick={() => setActiveId(video.id)}
                        className="rounded-lg overflow-hidden group cursor-pointer text-left w-full"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <div className="relative aspect-video overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg" style={{ background: "rgba(255,255,255,0.92)" }}>
                              <i className="fas fa-play text-sm ml-0.5" style={{ color: "var(--brand)" }} />
                            </div>
                          </div>
                        </div>
                        <div className="p-2.5" style={{ background: "var(--surface)" }}>
                          {video.league && (
                            <p className="text-[13px] font-bold truncate" style={{ color: "var(--brand)" }}>{video.league}</p>
                          )}
                          <p className="text-[12px] mb-1 truncate">
                            {video.publishedDate && (
                              <span className="font-bold" style={{ color: "var(--text-primary)" }}>{video.publishedDate} </span>
                            )}
                            {video.isHighlight && (
                              <span className="font-bold" style={{ color: "var(--text-primary)" }}>H/L</span>
                            )}
                          </p>
                          {video.homeTeam && video.awayTeam ? (
                            <div className="space-y-0.5 mb-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] font-bold px-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>H</span>
                                <SmallTeamLogo name={video.homeTeam} sport={video.category} logoMap={logoMap} enabled={logoEnabled} />
                                <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.homeTeam}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[12px] font-bold px-1 rounded" style={{ background: "var(--text-secondary)", color: "#fff" }}>A</span>
                                <SmallTeamLogo name={video.awayTeam} sport={video.category} logoMap={logoMap} enabled={logoEnabled} />
                                <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.awayTeam}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[14px] font-semibold leading-tight line-clamp-2 mb-1" style={{ color: "var(--text-primary)" }}>{video.title}</p>
                          )}
                          <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--text-secondary)" }}>
                            <span className="truncate max-w-[70%]">{video.channel}</span>
                            <span className="shrink-0">{video.publishedTime}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {/* 무한 스크롤 sentinel + 더보기 버튼 */}
            <div ref={sentinelRef} className="h-2" />
            {hasMore && videos.length < MAX_VIDEOS ? (
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="text-[13px] font-bold px-6 py-2.5 rounded-lg transition-all"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)", opacity: loadingMore ? 0.6 : 1 }}
                >
                  {loadingMore ? <><i className="fas fa-spinner fa-spin mr-1.5" />불러오는 중...</> : "더 보기"}
                </button>
              </div>
            ) : videos.length >= MAX_VIDEOS ? (
              <p className="text-center py-6 text-[12px]" style={{ color: "var(--text-secondary)" }}>최대 {MAX_VIDEOS}개까지 표시됩니다. 종목 필터를 사용해 좁혀보세요.</p>
            ) : (
              <p className="text-center py-6 text-[12px]" style={{ color: "var(--text-secondary)" }}>모든 영상을 불러왔습니다</p>
            )}
          </>
        )}
      </div>

      {/* 영상 모달 */}
      {activeId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setActiveId(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setActiveId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              >
                <i className="fas fa-times text-sm" />
              </button>
            </div>
            <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

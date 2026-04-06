"use client";

import { useState, useEffect } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import type { YouTubeVideo } from "@/lib/youtube";

function SmallTeamLogo({ name, logoMap, enabled }: { name: string; logoMap: Record<string, string>; enabled: boolean }) {
  if (!enabled) return null;
  const logo = logoMap[name];
  if (!logo) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`${logo}?v=2`} alt={name} className="w-4 h-4 rounded-full object-cover shrink-0" />;
}

export default function HighlightsPage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoYoutube ?? true)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/highlights?sport=${selectedSport}`)
      .then((r) => r.json())
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [selectedSport]);

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setActiveId(video.id)}
                className="rounded-lg overflow-hidden group cursor-pointer text-left w-full"
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="relative aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg" style={{ background: "rgba(255,255,255,0.92)" }}>
                      <i className="fas fa-play text-sm ml-0.5" style={{ color: "var(--brand)" }} />
                    </div>
                  </div>
                </div>
                <div className="p-2.5" style={{ background: "var(--surface)" }}>
                  {/* 리그명 */}
                  {video.league && (
                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--brand)" }}>{video.league}</p>
                  )}
                  {/* 경기일자 + H/L */}
                  <p className="text-[12px] mb-1 truncate">
                    {video.publishedDate && (
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{video.publishedDate} </span>
                    )}
                    {video.isHighlight && (
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>H/L</span>
                    )}
                  </p>
                  {/* 팀명 */}
                  {video.homeTeam && video.awayTeam ? (
                    <div className="space-y-0.5 mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-bold px-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>H</span>
                        <SmallTeamLogo name={video.homeTeam} logoMap={logoMap} enabled={logoEnabled} />
                        <p className="text-[14px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.homeTeam}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-bold px-1 rounded" style={{ background: "var(--text-secondary)", color: "#fff" }}>A</span>
                        <SmallTeamLogo name={video.awayTeam} logoMap={logoMap} enabled={logoEnabled} />
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

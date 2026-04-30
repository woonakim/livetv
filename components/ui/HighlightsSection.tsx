"use client";

import { useState, useEffect } from "react";
import type { YouTubeVideo } from "@/lib/youtube";
import { lookupTeamLogo } from "@/lib/team-name";

function SmallTeamLogo({ name, sport, logoMap, enabled }: { name: string; sport?: string; logoMap: Record<string, string>; enabled: boolean }) {
  if (!enabled) return null;
  const logo = lookupTeamLogo(logoMap, name, sport);
  if (!logo) return null;
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={`${logo}?v=3`} alt={name} className="w-4 h-4 rounded-full object-cover shrink-0" />;
}

interface Props {
  videos: YouTubeVideo[];
  layout: "mobile" | "desktop";
}

export default function HighlightsSection({ videos, layout }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logoMap, setLogoMap] = useState<Record<string, string>>({});
  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/team-logos").then(r => r.json()).then(setLogoMap).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoYoutube ?? true)).catch(() => {});
  }, []);

  if (layout === "desktop") {
    return (
      <>
        <div className="grid grid-cols-5 gap-2">
          {videos.slice(0, 5).map((video) => (
            <button
              key={video.id}
              onClick={() => setActiveId(video.id)}
              className="rounded-lg overflow-hidden group cursor-pointer text-left w-full"
              style={{ border: "1px solid #f3f4f6" }}
            >
              <div className="relative aspect-video overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                    <i className="fas fa-play text-xs ml-0.5" style={{ color: "var(--brand)" }} />
                  </div>
                </div>
              </div>
              <div className="p-2" style={{ background: "var(--surface)" }}>
                {video.league && (
                  <p className="text-[12px] font-bold truncate" style={{ color: "var(--brand)" }}>{video.league}</p>
                )}
                <p className="text-[11px] mb-1 truncate">
                  {video.publishedDate && <span className="font-bold" style={{ color: "var(--text-primary)" }}>{video.publishedDate} </span>}
                  {video.isHighlight && <span className="font-bold" style={{ color: "var(--text-primary)" }}>H/L</span>}
                </p>
                {video.homeTeam && video.awayTeam ? (
                  <div className="space-y-0.5 mb-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold px-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>H</span>
                      <SmallTeamLogo name={video.homeTeam} sport={video.category} logoMap={logoMap} enabled={logoEnabled} />
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.homeTeam}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold px-1 rounded" style={{ background: "var(--text-secondary)", color: "#fff" }}>A</span>
                      <SmallTeamLogo name={video.awayTeam} sport={video.category} logoMap={logoMap} enabled={logoEnabled} />
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.awayTeam}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[13px] font-semibold leading-tight line-clamp-2" style={{ color: "var(--text-primary)" }}>{video.title}</p>
                )}
                <p className="text-[11px] mt-1 truncate" style={{ color: "var(--text-secondary)" }}>{video.channel} · {video.publishedTime}</p>
              </div>
            </button>
          ))}
        </div>

        {activeId && <YoutubeModal id={activeId} onClose={() => setActiveId(null)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex overflow-x-auto gap-2 px-3 pb-3" style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>
        {videos.length > 0 ? videos.map((video) => (
          <button
            key={video.id}
            onClick={() => setActiveId(video.id)}
            className="flex-none rounded-lg p-2 text-left"
            style={{ width: 155, scrollSnapAlign: "start", border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <div className="w-full rounded-lg overflow-hidden mb-1.5 relative" style={{ height: 88 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.85)" }}>
                  <i className="fas fa-play text-xs ml-0.5" style={{ color: "var(--brand)" }} />
                </div>
              </div>
            </div>
            {video.league && (
              <p className="text-[12px] font-bold truncate" style={{ color: "var(--brand)" }}>{video.league}</p>
            )}
            <p className="text-[11px] mb-1 truncate">
              {video.publishedDate && <span className="font-bold" style={{ color: "var(--text-primary)" }}>{video.publishedDate} </span>}
              {video.isHighlight && <span className="font-bold" style={{ color: "var(--text-primary)" }}>H/L</span>}
            </p>
            {video.homeTeam && video.awayTeam ? (
              <div className="space-y-0.5 mb-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>H</span>
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.homeTeam}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold px-1 rounded" style={{ background: "var(--text-secondary)", color: "#fff" }}>A</span>
                  <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{video.awayTeam}</p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>{video.title}</p>
            )}
            <p className="text-[11px] mt-1 truncate" style={{ color: "var(--text-secondary)" }}>{video.channel} · {video.publishedTime}</p>
          </button>
        )) : (
          <p className="px-1 py-4 text-[12px]" style={{ color: "var(--text-secondary)" }}>하이라이트를 불러오는 중...</p>
        )}
      </div>

      {activeId && <YoutubeModal id={activeId} onClose={() => setActiveId(null)} />}
    </>
  );
}

function YoutubeModal({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
          >
            <i className="fas fa-times text-sm" />
          </button>
        </div>
        {/* 유튜브 embed */}
        <div className="w-full rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

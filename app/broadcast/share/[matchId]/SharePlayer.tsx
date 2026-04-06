"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { SportsLiveMatch } from "@/lib/sports-live";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀", volleyball: "🏐",
  hockey: "🏒", esports: "🎮", ufc: "🥊",
};

export default function SharePlayer({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<SportsLiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function findMatch() {
      try {
        const res = await fetch("/api/sports-live");
        if (!res.ok) throw new Error();
        const data = await res.json();
        const all = [...(data.live || []), ...(data.waiting || [])];
        const found = all.find((m: SportsLiveMatch) => m.id === matchId);
        if (found) {
          setMatch(found);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    findMatch();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 animate-spin" style={{ border: "3px solid var(--border)", borderTopColor: "var(--brand)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>경기 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center p-8 rounded-xl max-w-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="text-4xl mb-4">📺</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>경기를 찾을 수 없습니다</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            해당 경기가 종료되었거나, 현재 진행 중이지 않습니다.
          </p>
          <Link
            href="/broadcast"
            className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-bold"
            style={{ background: "var(--brand)" }}
          >
            중계 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  const emoji = SPORT_EMOJI[match.sport] || "🏟️";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* 상단 바 */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-12" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/broadcast" className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          전체 중계 보기
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white" style={{ background: match.isLive ? "#dc2626" : "#6b7280" }}>
            {match.isLive ? "● LIVE" : "대기"}
          </span>
        </div>
      </div>

      {/* 비디오 플레이어 */}
      <div className="relative w-full bg-black aspect-video max-h-[70vh]">
        <iframe
          src={match.streamUrl ?? ""}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>

      {/* 경기 정보 */}
      <div className="max-w-3xl mx-auto p-4">
        <div className="rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{emoji}</span>
            <div>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--brand)", color: "#fff" }}>{match.league}</span>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{match.date} {match.time}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{match.home}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>HOME</p>
            </div>
            <div className="text-xl font-black" style={{ color: "var(--brand)" }}>VS</div>
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{match.away}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>AWAY</p>
            </div>
          </div>

          <div className="flex justify-center mt-4">
            <Link
              href="/broadcast"
              className="px-6 py-2.5 rounded-lg text-white text-sm font-bold"
              style={{ background: "var(--brand)" }}
            >
              전체 중계 페이지에서 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

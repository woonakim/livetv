"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import TeamLogo from "@/components/ui/TeamLogo";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀",
  volleyball: "🏐", esports: "🎮", ufc: "🥊", lol: "🏆",
};

interface AnalysisItem {
  id: number;
  sport: string;
  league: string;
  matchTime: string;
  home: { name: string; logo: string; record: string };
  away: { name: string; logo: string; record: string };
  title: string;
  prediction: string;
  result: string;
  isPremium: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  author: { nickname: string; role: string };
}

function formatMatchTime(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${month}월${day}일(${dow}) ${hour}:${min}`;
}

const RESULT_BADGE: Record<string, { label: string; bg: string }> = {
  WIN: { label: "적중", bg: "#16a34a" },
  LOSS: { label: "실패", bg: "#dc2626" },
  CANCEL: { label: "취소", bg: "#6b7280" },
};

export default function AnalysisPage() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [posts, setPosts] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoAnalysis ?? true)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analysis?sport=${selectedSport}`)
      .then(r => r.json())
      .then(data => setPosts(data.items || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [selectedSport]);

  const canWrite = user && ["PICKSTER", "ADMIN", "SUPERADMIN"].includes(user.role);

  return (
    <>
      <div className="flex flex-col gap-3 p-2">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black" style={{ color: "var(--brand)" }}>📊 스포츠 분석</h1>
          <div className="flex items-center gap-2">
            {canWrite && (
              <Link href="/analysis/write" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
                글쓰기
              </Link>
            )}
            <Link
              href="/analysis/premium"
              className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
              style={{ background: "var(--brand)" }}
            >
              ⭐ 프리미엄 분석
            </Link>
          </div>
        </div>

        {/* 종목 필터 */}
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
          >
            <span className="text-[18px]">📊</span>
            <span className="text-[11px] font-bold" style={{ color: selectedSport === "all" ? "#fff" : "var(--text-secondary)" }}>전체</span>
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
            >
              <span className="text-[18px]">{sport.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: selectedSport === sport.id ? "#fff" : "var(--text-secondary)" }}>{sport.name}</span>
            </button>
          ))}
        </div>

        {/* 분석 카드 목록 */}
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>등록된 분석 포스트가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/analysis/${post.id}`}
                className="block rounded-lg overflow-hidden transition-opacity hover:opacity-90"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(8,8,8,0.15)" }}
              >
                <div className="relative px-4 pt-3 pb-4" style={{ minHeight: 120 }}>
                  <div className="absolute top-3 left-0 right-0 text-center text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    {post.league}
                  </div>
                  <div className="w-full text-center text-[13px] font-semibold mt-6" style={{ color: "#ff8c00" }}>
                    {formatMatchTime(post.matchTime)}
                  </div>
                  {post.result !== "PENDING" && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: RESULT_BADGE[post.result]?.bg ?? "#6b7280" }}>
                        {RESULT_BADGE[post.result]?.label ?? post.result}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mt-3 relative">
                    <div className="w-[40%] flex flex-col items-center gap-1 px-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg)" }}>
                        <TeamLogo logo={post.home.logo} name={post.home.name} fallbackEmoji={SPORT_EMOJI[post.sport] ?? "🏅"} size={36} enabled={logoEnabled} />
                      </div>
                      <p className="text-[14px] font-semibold text-center truncate w-full" style={{ color: "var(--text-primary)" }}>{post.home.name}</p>
                      <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>{post.home.record}</p>
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 text-[15px] font-medium" style={{ top: 14, color: "var(--text-primary)" }}>VS</div>
                    <div className="w-[40%] flex flex-col items-center gap-1 px-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg)" }}>
                        <TeamLogo logo={post.away.logo} name={post.away.name} fallbackEmoji={SPORT_EMOJI[post.sport] ?? "🏅"} size={36} enabled={logoEnabled} />
                      </div>
                      <p className="text-[14px] font-semibold text-center truncate w-full" style={{ color: "var(--text-primary)" }}>{post.away.name}</p>
                      <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>{post.away.record}</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
                  {post.isPremium && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 text-white" style={{ background: "var(--brand)" }}>PRO</span>
                  )}
                  <p className="flex-1 text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                  <div className="flex items-center gap-2 text-[10px] shrink-0" style={{ color: "var(--text-secondary)" }}>
                    <span>👁 {post.viewCount.toLocaleString()}</span>
                    <span>❤️ {post.likeCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

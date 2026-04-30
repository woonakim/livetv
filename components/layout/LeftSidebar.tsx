"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import SidebarBanners from "@/components/ui/SidebarBanners";
import TeamLogo from "@/components/ui/TeamLogo";
import StandingsWidget from "@/components/ui/StandingsWidget";

interface AnalysisItem {
  id: number;
  sport: string;
  league: string;
  matchTime: string;
  home: { name: string; logo: string; record: string };
  away: { name: string; logo: string; record: string };
  title: string;
  isPremium: boolean;
  result: string;
}

const RESULT_BADGE: Record<string, { label: string; bg: string }> = {
  WIN: { label: "적중", bg: "#16a34a" },
  LOSS: { label: "실패", bg: "#dc2626" },
  CANCEL: { label: "취소", bg: "#6b7280" },
};

function formatMatchTime(iso: string) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dow = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${month}월${day}일(${dow}) ${hour}:${min}`;
}

export default function LeftSidebar() {
  const [posts, setPosts] = useState<AnalysisItem[]>([]);

  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/analysis?limit=10&upcoming=true").then(r => r.json()).then(data => setPosts(data.items || [])).catch(() => {});
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoAnalysis ?? true)).catch(() => {});
  }, []);

  return (
    <aside className="flex flex-col gap-2 shrink-0" style={{ width: "var(--sidebar-width)" }}>

      {/* 상단 배너 (DB 관리) */}
      <SidebarBanners position="left_top" />

      {/* 스포츠 분석 */}
      <div className="rounded-lg overflow-hidden shadow-card" style={{ background: "var(--surface)" }}>
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div className="flex items-center gap-1 font-bold">
            <i className="fas fa-chart-line" style={{ color: "var(--brand)" }} />
            <span style={{ color: "var(--brand)" }}>스포츠</span>
            <span style={{ color: "var(--text-primary)" }}>분석</span>
          </div>
          <Link href="/analysis" className="text-xs font-bold hover:underline" style={{ color: "var(--text-primary)" }}>
            더보기 +
          </Link>
        </div>

        <div className="max-h-[680px] overflow-y-auto custom-scrollbar p-2 space-y-2">
          {posts.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: "var(--text-secondary)" }}>등록된 분석글이 없습니다.</div>
          ) : (
            posts.map((post) => (
              <Link
                key={post.id}
                href={`/analysis/${post.id}`}
                className="block rounded overflow-hidden hover:opacity-90 transition-opacity"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(8,8,8,0.15)" }}
              >
                {/* 매치카드 */}
                <div className="relative px-1 pt-2 pb-2" style={{ height: 125 }}>
                  {/* 결과 뱃지 */}
                  {post.result !== "PENDING" && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: RESULT_BADGE[post.result]?.bg ?? "#6b7280" }}>
                        {RESULT_BADGE[post.result]?.label ?? post.result}
                      </span>
                    </div>
                  )}
                  {/* 경기시간 */}
                  <div className="w-full text-center text-[14px] font-semibold leading-[16px]" style={{ color: "#ff8c00" }}>
                    {formatMatchTime(post.matchTime)}
                  </div>
                  {/* 리그명 */}
                  <div className="absolute w-full text-center left-0 top-[30px] text-[16px] font-semibold leading-[19px]" style={{ color: "var(--text-primary)" }}>
                    {post.league}
                  </div>
                  {/* 홈팀 / 원정팀 */}
                  <div className="flex justify-between items-start mt-[10px]">
                    <div className="flex flex-col items-center px-1.5" style={{ width: "calc(50% - 10px)" }}>
                      <div className="w-10 h-[43px] mb-[5px] flex items-center justify-center">
                        <TeamLogo logo={post.home.logo} name={post.home.name} fallbackEmoji={SPORT_CATEGORIES.find((s) => s.id === post.sport)?.emoji ?? "🏅"} size={36} enabled={logoEnabled} />
                      </div>
                      <p className="text-[14px] font-semibold text-center w-full truncate leading-[19px]" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{post.home.name}</p>
                      <p className="text-[12px] text-center mt-1 leading-[14px]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.5px" }}>{post.home.record}</p>
                    </div>
                    <div className="flex flex-col items-center px-1.5" style={{ width: "calc(50% - 10px)" }}>
                      <div className="w-10 h-[43px] mb-[5px] flex items-center justify-center">
                        <TeamLogo logo={post.away.logo} name={post.away.name} fallbackEmoji={SPORT_CATEGORIES.find((s) => s.id === post.sport)?.emoji ?? "🏅"} size={36} enabled={logoEnabled} />
                      </div>
                      <p className="text-[14px] font-semibold text-center w-full truncate leading-[19px]" style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{post.away.name}</p>
                      <p className="text-[12px] text-center mt-1 leading-[14px]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.5px" }}>{post.away.record}</p>
                    </div>
                  </div>
                  {/* VS */}
                  <div className="absolute left-1/2 -translate-x-1/2 text-[16px] font-medium leading-[19px]" style={{ top: 74, color: "var(--text-primary)" }}>VS</div>
                </div>
                {/* 분석 제목 */}
                <div className="px-3 py-2 flex items-center gap-1.5" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
                  {post.isPremium && (
                    <span className="shrink-0 text-white text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--brand)" }}>PRO</span>
                  )}
                  <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 스코어 정보 위젯 */}
      <StandingsWidget />

      {/* 하단 배너 (DB 관리) */}
      <SidebarBanners position="left_bottom" />

    </aside>
  );
}

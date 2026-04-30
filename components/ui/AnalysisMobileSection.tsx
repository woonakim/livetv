"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀",
  volleyball: "🏐", hockey: "🏒", esports: "🎮", ufc: "🥊", lol: "🏆",
};

interface AnalysisItem {
  id: number;
  sport: string;
  title: string;
  isPremium: boolean;
  viewCount: number;
}

export default function AnalysisMobileSection() {
  const [posts, setPosts] = useState<AnalysisItem[]>([]);

  useEffect(() => {
    fetch("/api/analysis?limit=3&upcoming=true")
      .then(r => r.json())
      .then(data => setPosts(data.items || []))
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pb-3 px-1">
      {posts.map((post) => (
        <Link key={post.id} href={`/analysis/${post.id}`}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ border: "1px solid var(--border)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(8,8,8,0.1)" }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: "var(--bg)" }}>
            {SPORT_EMOJI[post.sport] ?? "🏅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>{post.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {post.isPremium && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--brand)", color: "#fff" }}>프리미엄</span>
              )}
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>👁 {post.viewCount.toLocaleString()}</span>
            </div>
          </div>
          <i className="fas fa-chevron-right text-[12px] flex-shrink-0" style={{ color: "var(--text-secondary)" }} />
        </Link>
      ))}
    </div>
  );
}

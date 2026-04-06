"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import TeamLogo from "@/components/ui/TeamLogo";

const SPORT_EMOJI: Record<string, string> = {
  soccer: "⚽", baseball: "⚾", basketball: "🏀",
  volleyball: "🏐", esports: "🎮", ufc: "🥊", lol: "🏆",
};

const RESULT_BADGE: Record<string, { label: string; bg: string }> = {
  WIN: { label: "적중", bg: "#16a34a" },
  LOSS: { label: "실패", bg: "#dc2626" },
  CANCEL: { label: "취소", bg: "#6b7280" },
};

interface PostDetail {
  id: number;
  sport: string;
  league: string;
  matchTime: string;
  home: { name: string; logo: string; record: string };
  away: { name: string; logo: string; record: string };
  title: string;
  content: string;
  prediction: string;
  odds: string;
  result: string;
  isPremium: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  author: { nickname: string; role: string };
  prevId: number | null;
  nextId: number | null;
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} className="text-[15px] font-black mt-4 mb-1.5 pb-1" style={{ color: "var(--text-primary)", borderBottom: "2px solid var(--brand)" }}>
          {line.replace("## ", "")}
        </h2>
      );
      continue;
    }
    if (line.startsWith("- ")) {
      const parts = line.replace("- ", "").split(/\*\*(.*?)\*\*/g);
      elements.push(
        <li key={key++} className="text-[12px] ml-3 mb-0.5 list-disc" style={{ color: "var(--text-secondary)" }}>
          {parts.map((part, index) => index % 2 === 1 ? <strong key={index} style={{ color: "var(--text-primary)" }}>{part}</strong> : part)}
        </li>
      );
      continue;
    }
    if (line.trim() === "") { elements.push(<div key={key++} className="h-1" />); continue; }
    const parts = line.split(/\*\*(.*?)\*\*/g);
    elements.push(
      <p key={key++} className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {parts.map((part, index) => index % 2 === 1 ? <strong key={index} style={{ color: "var(--text-primary)" }}>{part}</strong> : part)}
      </p>
    );
  }
  return elements;
}

export default function AnalysisDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; role: string; nickname: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analysis/${id}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setPost)
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/site-settings").then(r => r.json()).then(s => setLogoEnabled(s.showLogoAnalysis ?? true)).catch(() => {});
  }, []);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const canEdit = isAdmin || (post && user && post.author.nickname === user.nickname);

  const setResult = async (result: string) => {
    if (!confirm(`이 포스트를 "${RESULT_BADGE[result]?.label}"(으)로 설정하시겠습니까?`)) return;
    await fetch(`/api/analysis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
    setPost(prev => prev ? { ...prev, result } : null);
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">분석 글을 찾을 수 없습니다.</p>
        <Link href="/analysis" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 목록으로</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      <Link href="/analysis" className="flex items-center gap-1 text-xs font-bold w-fit" style={{ color: "var(--text-secondary)" }}>
        <i className="fas fa-chevron-left text-[10px]" /> 스포츠 분석 목록
      </Link>

      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "var(--brand)" }}>{post.league}</span>
          {post.isPremium && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#d97706" }}>PRO</span>}
          {post.result !== "PENDING" && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: RESULT_BADGE[post.result]?.bg ?? "#6b7280" }}>
              {RESULT_BADGE[post.result]?.label ?? post.result}
            </span>
          )}
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{formatMatchTime(post.matchTime)}</span>
        </div>
        <h1 className="text-[16px] font-black leading-snug mb-3" style={{ color: "var(--text-primary)" }}>{post.title}</h1>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <span>✍️ {post.author.nickname}</span>
            <span>📅 {formatDate(post.createdAt)}</span>
            <span>👁 {post.viewCount.toLocaleString()}</span>
            <span>❤️ {post.likeCount}</span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              <a href={`/analysis/edit/${post.id}`} className="text-[11px] font-bold px-2.5 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>수정</a>
              <button onClick={async () => { if (!confirm("삭제하시겠습니까?")) return; await fetch(`/api/analysis/${id}`, { method: "DELETE" }); router.push("/analysis"); }} className="text-[11px] font-bold px-2.5 py-1 rounded text-white" style={{ background: "#dc2626" }}>삭제</button>
            </div>
          )}
        </div>

        {/* 관리자: 결과 설정 */}
        {isAdmin && post.result === "PENDING" && (
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>결과:</span>
            <button onClick={() => setResult("WIN")} className="text-[11px] font-bold px-3 py-1 rounded text-white" style={{ background: "#16a34a" }}>적중</button>
            <button onClick={() => setResult("LOSS")} className="text-[11px] font-bold px-3 py-1 rounded text-white" style={{ background: "#dc2626" }}>실패</button>
            <button onClick={() => setResult("CANCEL")} className="text-[11px] font-bold px-3 py-1 rounded text-white" style={{ background: "#6b7280" }}>취소</button>
          </div>
        )}
      </div>

      {/* 매치 카드 */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 pt-4 pb-5">
          <div className="text-center text-[14px] font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{post.league}</div>
          <div className="flex items-start justify-between relative">
            <div className="w-[40%] flex flex-col items-center gap-1 px-2">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg)" }}>
                <TeamLogo logo={post.home.logo} name={post.home.name} fallbackEmoji={SPORT_EMOJI[post.sport] ?? "🏅"} size={42} enabled={logoEnabled} />
              </div>
              <p className="text-[14px] font-semibold text-center" style={{ color: "var(--text-primary)" }}>{post.home.name}</p>
              <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>{post.home.record}</p>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-3 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>VS</div>
            <div className="w-[40%] flex flex-col items-center gap-1 px-2">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--bg)" }}>
                <TeamLogo logo={post.away.logo} name={post.away.name} fallbackEmoji={SPORT_EMOJI[post.sport] ?? "🏅"} size={42} enabled={logoEnabled} />
              </div>
              <p className="text-[14px] font-semibold text-center" style={{ color: "var(--text-primary)" }}>{post.away.name}</p>
              <p className="text-[11px] text-center" style={{ color: "var(--text-secondary)" }}>{post.away.record}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
          <div className="px-3 py-2.5" style={{ background: "var(--bg)" }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>추천 픽</p>
            <p className="text-[13px] font-black" style={{ color: "var(--brand)" }}>{post.prediction}</p>
          </div>
          <div className="px-3 py-2.5" style={{ background: "var(--bg)" }}>
            <p className="text-[10px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>기준 배당</p>
            <p className="text-[13px] font-black" style={{ color: "var(--text-primary)" }}>{post.odds || "-"}</p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-col gap-0.5">{renderContent(post.content)}</div>
      </div>

      {/* 이전/다음 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {post.nextId && (
          <Link href={`/analysis/${post.nextId}`} className="flex items-center gap-2 px-3 py-2.5 text-[12px]" style={{ borderBottom: post.prevId ? "1px solid var(--border)" : "0", background: "var(--surface)" }}>
            <span className="shrink-0 font-bold" style={{ color: "var(--brand)" }}>▲ 다음글</span>
          </Link>
        )}
        {post.prevId && (
          <Link href={`/analysis/${post.prevId}`} className="flex items-center gap-2 px-3 py-2.5 text-[12px]" style={{ background: "var(--surface)" }}>
            <span className="shrink-0 font-bold" style={{ color: "var(--text-secondary)" }}>▼ 이전글</span>
          </Link>
        )}
      </div>

      <Link href="/analysis" className="text-center py-2 rounded-lg text-sm font-bold" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
        목록으로
      </Link>
    </div>
  );
}

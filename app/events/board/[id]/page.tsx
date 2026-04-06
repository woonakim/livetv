"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface EventPost {
  id: number;
  title: string;
  content: string;
  author: string;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
}

function renderContent(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("■ ")) {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-[13px] leading-relaxed font-semibold" style={{ color: "var(--text-primary)" }}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "var(--brand)" }}>{p}</strong> : p)}
        </p>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-2" />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "var(--text-primary)" }}>{p}</strong> : p)}
      </p>
    );
  });
}

export default function EventBoardDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [post, setPost] = useState<EventPost | null>(null);
  const [allPosts, setAllPosts] = useState<EventPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/event-board/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/event-board").then(r => r.json()),
    ]).then(([detail, list]) => {
      setPost(detail);
      setAllPosts(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  if (!post) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">게시글을 찾을 수 없습니다.</p>
        <Link href="/events/board" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 목록으로</Link>
      </div>
    );
  }

  const idx = allPosts.findIndex(p => p.id === id);
  const prevPost = idx < allPosts.length - 1 ? allPosts[idx + 1] : null;
  const nextPost = idx > 0 ? allPosts[idx - 1] : null;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 p-2">

      {/* 뒤로가기 */}
      <Link href="/events/board" className="flex items-center gap-1 text-xs font-bold w-fit" style={{ color: "var(--text-secondary)" }}>
        <i className="fas fa-chevron-left text-[10px]" /> 이벤트 목록
      </Link>

      {/* 헤더 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          {post.isPinned && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "var(--brand)" }}>
              📌 이벤트
            </span>
          )}
        </div>
        <h1 className="text-[16px] font-black leading-snug mb-3" style={{ color: "var(--text-primary)" }}>
          {post.title}
        </h1>
        <div className="flex items-center gap-3 text-[11px] pt-2" style={{ borderTop: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <span>✍️ {post.author}</span>
          <span>📅 {formatDate(post.createdAt)}</span>
          <span>👁 {post.viewCount.toLocaleString()}</span>
        </div>
      </div>

      {/* 본문 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-col gap-0.5">
          {renderContent(post.content)}
        </div>
      </div>

      {/* 이전/다음 글 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {nextPost && (
          <Link
            href={`/events/board/${nextPost.id}`}
            className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <span className="shrink-0 font-bold" style={{ color: "var(--brand)" }}>▲ 다음글</span>
            <span className="truncate" style={{ color: "var(--text-primary)" }}>{nextPost.title}</span>
          </Link>
        )}
        {prevPost && (
          <Link
            href={`/events/board/${prevPost.id}`}
            className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
            style={{ background: "var(--surface)" }}
          >
            <span className="shrink-0 font-bold" style={{ color: "var(--text-secondary)" }}>▼ 이전글</span>
            <span className="truncate" style={{ color: "var(--text-primary)" }}>{prevPost.title}</span>
          </Link>
        )}
      </div>

      {/* 목록 버튼 */}
      <Link
        href="/events/board"
        className="text-center py-2 rounded-lg text-sm font-bold"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
      >
        목록으로
      </Link>

    </div>
  );
}

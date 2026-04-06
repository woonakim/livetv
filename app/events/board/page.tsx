"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface EventPost {
  id: number;
  title: string;
  author: string;
  isPinned: boolean;
  viewCount: number;
  createdAt: string;
}

export default function EventBoardPage() {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/event-board").then(r => r.json()).then(setPosts);
  }, []);

  const filtered = posts.filter(p => {
    if (!searchQuery.trim()) return true;
    return p.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="flex flex-col gap-2">

        {/* 타이틀 */}
        <div className="flex items-center justify-between mt-2 px-1">
          <h1 className="text-[20px] font-bold" style={{ color: "var(--brand)" }}>이벤트</h1>
          <Link
            href="/attendance"
            className="flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "var(--brand)", color: "#fff" }}
          >
            📅 출석체크
          </Link>
        </div>

        {/* 탭 */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="grid grid-cols-2 text-[13px] font-medium">
            <Link
              href="/events"
              className="flex items-center justify-center h-9 font-semibold transition-colors"
              style={{ color: "var(--text-secondary)", borderBottom: "2px solid transparent" }}
            >이벤트매치</Link>
            <button
              className="flex items-center justify-center h-9 font-semibold transition-colors"
              style={{ color: "var(--brand)", borderBottom: "2px solid var(--brand)" }}
            >이벤트</button>
          </div>
        </div>

        {/* 검색 */}
        <div className="flex justify-end items-center px-2 gap-1.5">
          <select
            className="h-[28px] w-[60px] px-1.5 rounded text-[13px] outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
          >
            <option value="title">제목</option>
            <option value="content">내용</option>
          </select>
          <div className="relative">
            <input
              type="text"
              placeholder="검색어 입력"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[28px] w-[120px] pl-2 pr-7 rounded text-[13px] outline-none"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2">
              <i className="fas fa-search text-[12px]" style={{ color: "#a8a8a8" }} />
            </button>
          </div>
        </div>

        {/* 목록 */}
        <ul className="flex flex-col gap-2 px-2 pb-4">
          {filtered.map((post) => (
            <li key={post.id}>
              <Link
                href={`/events/board/${post.id}`}
                className="block w-full p-2 px-3 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px 0 rgba(8,8,8,0.38)" }}
              >
                <div className="flex items-center gap-1 mb-2">
                  {post.isPinned && (
                    <i className="fas fa-thumbtack text-[13px] mr-0.5" style={{ color: "var(--brand)" }} />
                  )}
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {post.title}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]" style={{ color: "#a8a8a8" }}>
                  <span>작성자 : {post.author}</span>
                  <span>작성일 : {formatDate(post.createdAt)}</span>
                  <span>👁 {post.viewCount.toLocaleString()}</span>
                </div>
              </Link>
            </li>
          ))}

          {filtered.length === 0 && (
            <li className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              검색 결과가 없습니다.
            </li>
          )}
        </ul>

      </div>
    </>
  );
}

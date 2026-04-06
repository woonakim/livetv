"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface EventItem {
  id: number;
  title: string;
  bannerImg: string;
  teamA: string;
  teamB: string;
  deadline: string;
  createdAt: string;
  _count: { votes: number };
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("title");

  useEffect(() => {
    fetch("/api/events").then(r => r.json()).then(setEvents);
  }, []);

  const filtered = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    return e.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <>
      {/* 페이지 타이틀 */}
      <div className="flex items-center justify-between mt-2 px-1">
        <h1 className="text-[20px] font-bold" style={{ color: "var(--brand)" }}>이벤트매치</h1>
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
          <button
            className="flex items-center justify-center h-9 font-semibold transition-colors"
            style={{
              color: "var(--brand)",
              borderBottom: "2px solid var(--brand)",
            }}
          >이벤트매치</button>
          <button
            onClick={() => router.push("/events/board")}
            className="flex items-center justify-center h-9 font-semibold transition-colors"
            style={{
              color: "var(--text-secondary)",
              borderBottom: "2px solid transparent",
            }}
          >이벤트</button>
        </div>
      </div>

      {/* 검색 */}
      <div className="flex justify-end items-center gap-2 mt-1">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="h-[30px] px-2 text-[13px] font-medium rounded"
          style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
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
            className="w-[130px] h-[30px] pl-2 pr-8 text-[13px] rounded focus:outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--brand)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 이벤트 목록 */}
      <ul className="space-y-2 pb-6">
        {filtered.map((item) => {
          const isExpired = new Date(item.deadline) < new Date();
          return (
            <li key={item.id}>
              <Link
                href={`/events/${item.id}`}
                className="flex items-center p-3 rounded-lg transition-all hover:opacity-90"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 3px rgba(8,8,8,0.15)",
                  opacity: isExpired ? 0.6 : 1,
                }}
              >
                {/* 썸네일 */}
                <div className="w-[100px] h-[63px] mr-3 shrink-0 rounded overflow-hidden" style={{ background: "var(--bg)" }}>
                  <img
                    src={item.bannerImg}
                    alt="thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                {/* 텍스트 */}
                <div className="flex-grow min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {isExpired ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#94a3b8", color: "#fff" }}>마감</span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#dc2626", color: "#fff" }}>진행중</span>
                    )}
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>참여 {item._count.votes}명</span>
                  </div>
                  <div className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {item.title}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span>작성자 : 라이브TV</span>
                    <span>작성일 : {formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}

        {filtered.length === 0 && (
          <li className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            검색 결과가 없습니다.
          </li>
        )}
      </ul>
    </>
  );
}

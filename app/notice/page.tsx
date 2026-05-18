"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Notice {
  id: number; title: string; author: string; isPinned: boolean; viewCount: number; createdAt: string;
}

export default function NoticePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notices")
      .then(r => r.json())
      .then(setNotices)
      .finally(() => setLoading(false));
  }, []);

  const filtered = notices.filter(n => !searchQuery.trim() || n.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="px-3 py-2 mt-1 text-[20px] font-bold" style={{ color: "var(--brand)" }}>공지사항</div>
        <div className="px-3 h-6 flex items-center">
          <span className="text-[13px] font-semibold" style={{ color: "var(--brand)" }}>공지사항</span>
        </div>
        <div className="flex justify-end items-center px-2 gap-1.5">
          <select className="h-[28px] w-[60px] px-1.5 rounded text-[13px] outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
            <option value="title">제목</option>
            <option value="content">내용</option>
          </select>
          <div className="relative">
            <input type="text" placeholder="검색어 입력" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-[28px] w-[120px] pl-2 pr-7 rounded text-[13px] outline-none" style={{ border: "1px solid var(--border)", background: "var(--surface)" }} />
            <button className="absolute right-2 top-1/2 -translate-y-1/2"><i className="fas fa-search text-[12px]" style={{ color: "#a8a8a8" }} /></button>
          </div>
        </div>
        <ul className="flex flex-col gap-2 px-2 pb-4">
          {filtered.map((notice) => (
            <li key={notice.id}>
              <Link href={`/notice/${notice.id}`} className="block w-full p-2 px-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px 0 rgba(8,8,8,0.38)" }}>
                <div className="flex items-center gap-1 mb-2">
                  {notice.isPinned && <i className="fas fa-thumbtack text-[13px] mr-0.5" style={{ color: "var(--brand)" }} />}
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{notice.title}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[12px]" style={{ color: "#a8a8a8" }}>
                  <span>작성자 : {notice.author}</span>
                  <span>작성일 : {formatDate(notice.createdAt)}</span>
                  <span>조회 {notice.viewCount}</span>
                </div>
              </Link>
            </li>
          ))}
          {loading ? (
            <li className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</li>
          ) : filtered.length === 0 ? (
            <li className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              {searchQuery ? "검색 결과가 없습니다." : "공지사항이 없습니다."}
            </li>
          ) : null}
        </ul>
      </div>
    </>
  );
}

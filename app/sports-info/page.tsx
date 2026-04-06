"use client";

import { useState, useEffect } from "react";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  image: string | null;
  category: string;
  summary: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function SportsInfoPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then(r => r.json())
      .then(data => { setNews(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="flex flex-col gap-3 p-2">

        {/* 헤더 */}
        <h1 className="text-lg font-black" style={{ color: "var(--brand)" }}>📰 스포츠 뉴스</h1>

        {/* 뉴스 목록 */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px 0 rgba(8,8,8,0.18)" }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-sm font-bold" style={{ color: "var(--brand)" }}>📰 실시간 스포츠 뉴스</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "#dc2626" }}>LIVE</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>뉴스 불러오는 중...</div>
          ) : news.length === 0 ? (
            <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>뉴스를 불러올 수 없습니다.</div>
          ) : (
            <div className="flex flex-col">
              {news.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelected(item)}
                  className="flex items-start gap-3 px-3 py-3 transition-colors hover:opacity-80 text-left w-full"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border)" : "none", background: idx % 2 === 1 ? "var(--surface-alt)" : "var(--surface)" }}
                >
                  {item.image ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ background: "var(--surface-alt, #f1f5f9)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center text-2xl" style={{ background: "var(--surface-alt, #f1f5f9)" }}>
                      {item.category.split(" ")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      <span className="px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#f0f4ff", color: "var(--brand)" }}>
                        {item.category}
                      </span>
                      <span>{item.source}</span>
                      <span>·</span>
                      <span>{timeAgo(item.pubDate)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 뉴스 팝업 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f0f4ff", color: "var(--brand)" }}>
                {selected.category}
              </span>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-sm"
                style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {selected.image && (
                <div className="w-full rounded-lg overflow-hidden mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={selected.image} alt="" className="w-full h-auto" />
                </div>
              )}
              <h2 className="text-[15px] font-black leading-snug mb-2" style={{ color: "var(--text-primary)" }}>
                {selected.title}
              </h2>
              <div className="flex items-center gap-2 mb-3 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                <span>{selected.source}</span>
                <span>·</span>
                <span>{new Date(selected.pubDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="text-[13px] leading-relaxed whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
                {selected.summary || "본문 미리보기를 불러올 수 없습니다."}
              </div>
            </div>
            <div className="shrink-0 px-4 py-3 flex gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-bold"
                style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
              >닫기</button>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white text-center"
                style={{ background: "var(--brand)" }}
              >원문 보기 →</a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

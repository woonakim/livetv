"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Partner {
  id: number;
  name: string;
  category: string;
  badge: string;
  desc: string;
  img: string;
  likes: number;
  views: number;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [liked, setLiked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/partners").then(r => r.json()).then(setPartners);
  }, []);

  const toggleLike = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div className="p-2">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-black" style={{ color: "var(--brand)" }}>🤝 스폰업체</h1>
          <button
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            입점 신청
          </button>
        </div>

        {/* 카드 그리드 */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 list-none p-0 m-0">
          {partners.map((partner) => {
            const isLiked = liked[partner.id];
            return (
              <li key={partner.id}>
                <Link
                  href={`/partners/${partner.id}`}
                  className="relative flex flex-col rounded-lg overflow-hidden h-full block"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px 0 rgba(8,8,8,0.38)" }}
                >
                  {/* 배지 */}
                  <span
                    className="absolute top-2 left-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "#1d4ed8", color: "#fff" }}
                  >
                    {partner.badge}
                  </span>

                  {/* 썸네일 */}
                  <div className="w-full overflow-hidden" style={{ aspectRatio: "4/3" }}>
                    <img
                      src={partner.img}
                      alt={partner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 텍스트 */}
                  <div className="p-2 flex flex-col flex-1">
                    <div className="text-[11px] mb-0.5 truncate" style={{ color: "var(--text-secondary)" }}>
                      {partner.category}
                    </div>
                    <div className="text-[13px] font-semibold mb-1 truncate" style={{ color: "var(--text-primary)" }}>
                      {partner.name}
                    </div>
                    <div
                      className="text-[11px] leading-snug"
                      style={{
                        color: "var(--text-secondary)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      } as React.CSSProperties}
                    >
                      {partner.desc}
                    </div>
                  </div>

                  {/* 하단 바 */}
                  <div className="flex items-center justify-between px-2 pb-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span>👁 {partner.views.toLocaleString()}</span>
                    <button
                      onClick={(e) => toggleLike(e, partner.id)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition-colors"
                      style={{
                        border: "1px solid var(--border)",
                        background: isLiked ? "#fee2e2" : "var(--surface)",
                        color: isLiked ? "#dc2626" : "var(--brand)",
                      }}
                    >
                      {isLiked ? "❤️" : "🤍"} {partner.likes + (isLiked ? 1 : 0)}
                    </button>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

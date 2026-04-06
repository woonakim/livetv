"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  thumb: string;
  category: string;
}

export default function PointsPage() {
  const [activeTab, setActiveTab] = useState<"spon" | "affiliate">("spon");
  const [products, setProducts] = useState<Product[]>([]);
  const [userPoints, setUserPoints] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/point-products").then(r => r.json()).then(setProducts);
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUserPoints(d.user.points ?? 0);
    }).catch(() => {});
  }, []);

  const filtered = products.filter(p => p.category === activeTab);

  return (
    <>
      {/* 페이지 타이틀 + 내 포인트 */}
      <div className="flex items-center justify-between px-3 py-2 rounded-md mt-2" style={{ background: "var(--surface)" }}>
        <span className="text-[20px] font-bold" style={{ color: "var(--brand)" }}>포인트전환</span>
        <div className="flex items-center gap-2">
          {userPoints !== null && (
            <span className="text-[13px] font-bold px-2.5 py-1 rounded-lg" style={{ background: "var(--bg)", color: "var(--brand)", border: "1px solid var(--border)" }}>
              💰 {userPoints.toLocaleString()} P
            </span>
          )}
          <Link
            href="/points/exchange"
            className="text-[12px] font-bold px-2.5 py-1 rounded-lg text-white"
            style={{ background: "var(--brand)" }}
          >
            교환내역
          </Link>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="grid grid-cols-2 text-[13px] font-medium">
          <button
            onClick={() => setActiveTab("spon")}
            className="flex items-center justify-center h-9 font-semibold transition-colors"
            style={{
              color: activeTab === "spon" ? "var(--brand)" : "var(--text-secondary)",
              borderBottom: activeTab === "spon" ? "2px solid var(--brand)" : "2px solid transparent",
            }}
          >스폰상품</button>
          <button
            onClick={() => setActiveTab("affiliate")}
            className="flex items-center justify-center h-9 font-semibold transition-colors"
            style={{
              color: activeTab === "affiliate" ? "var(--brand)" : "var(--text-secondary)",
              borderBottom: activeTab === "affiliate" ? "2px solid var(--brand)" : "2px solid transparent",
            }}
          >제휴스폰</button>
        </div>
      </div>

      {/* 상품 그리드 */}
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-2 gap-y-4 px-1 pb-8 mt-2">
        {filtered.map((item) => (
          <li key={item.id}>
            <Link
              href={`/points/${item.id}`}
              className="flex flex-col gap-2 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <div
                className="relative w-full rounded-lg overflow-hidden"
                style={{ aspectRatio: "180/137", border: "1px solid var(--border)" }}
              >
                <img src={item.thumb} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="rounded px-2 py-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-[12px] font-bold text-center truncate leading-snug" style={{ color: "var(--text-primary)" }}>
                  {item.name}
                </p>
                <p className="text-[14px] font-bold text-center mt-0.5" style={{ color: "var(--brand)" }}>
                  {item.price.toLocaleString()} P
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

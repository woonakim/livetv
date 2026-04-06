"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Exchange {
  id: number;
  amount: number;
  productName: string;
  status: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "대기중", color: "#b45309", bg: "#fef3c7" },
  PROCESSING: { label: "처리중", color: "#1d4ed8", bg: "#dbeafe" },
  COMPLETED:  { label: "완료", color: "#16a34a", bg: "#dcfce7" },
  CANCELLED:  { label: "취소", color: "#dc2626", bg: "#fee2e2" },
};

export default function ExchangeHistoryPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/point-exchange")
      .then(r => r.ok ? r.json() : [])
      .then(d => { setExchanges(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2 mt-2">
        <span className="text-[20px] font-bold" style={{ color: "var(--brand)" }}>교환 내역</span>
        <Link
          href="/points"
          className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          ← 포인트전환
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>
      ) : exchanges.length === 0 ? (
        <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          교환 내역이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-2 px-2 pb-4">
          {exchanges.map(ex => {
            const st = STATUS_MAP[ex.status] ?? STATUS_MAP.PENDING;
            return (
              <li
                key={ex.id}
                className="p-3 rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(8,8,8,0.15)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-bold truncate flex-1 mr-2" style={{ color: "var(--text-primary)" }}>
                    {ex.productName}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  <span>{formatDate(ex.createdAt)}</span>
                  <span className="font-bold" style={{ color: "var(--brand)" }}>-{ex.amount.toLocaleString()} P</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

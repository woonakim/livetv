"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price: number;
  thumb: string;
  category: string;
}

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

export default function PointProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const fetchData = () => {
    Promise.all([
      fetch("/api/point-products").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()).catch(() => ({})),
      fetch("/api/point-exchange").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([products, me, exList]) => {
      setProduct(products.find((p: Product) => p.id === id) ?? null);
      if (me.user) setUserPoints(me.user.points ?? 0);
      setExchanges(exList);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleExchange = async () => {
    if (!product || exchanging) return;
    setExchanging(true);
    setResult(null);
    try {
      const res = await fetch("/api/point-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: data.error });
      } else {
        setResult({ ok: true, msg: `${product.name} 교환 신청이 완료되었습니다!` });
        setUserPoints(prev => prev !== null ? prev - product.price : null);
        // 교환 내역 새로고침
        fetch("/api/point-exchange").then(r => r.ok ? r.json() : []).then(setExchanges);
      }
    } catch {
      setResult({ ok: false, msg: "서버 오류가 발생했습니다." });
    }
    setExchanging(false);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  };

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  if (!product) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)" }}>
        <p className="text-sm">상품을 찾을 수 없습니다.</p>
        <Link href="/points" className="text-xs font-bold mt-2 inline-block" style={{ color: "var(--brand)" }}>← 포인트전환</Link>
      </div>
    );
  }

  const canExchange = userPoints !== null && userPoints >= product.price;

  return (
    <div className="flex flex-col gap-3 p-2">

      {/* 뒤로가기 */}
      <Link href="/points" className="flex items-center gap-1 text-xs font-bold w-fit" style={{ color: "var(--text-secondary)" }}>
        <i className="fas fa-chevron-left text-[10px]" /> 포인트전환
      </Link>

      {/* 상품 카드 */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {/* 이미지 */}
        <div className="w-full flex justify-center p-4" style={{ background: "var(--bg)" }}>
          <div className="w-[200px] h-[200px] rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <img src={product.thumb} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="p-4">
          <p className="text-[11px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
            {product.category === "spon" ? "스폰상품" : "제휴스폰"}
          </p>
          <h1 className="text-[17px] font-black mb-2" style={{ color: "var(--text-primary)" }}>{product.name}</h1>
          <p className="text-[24px] font-black" style={{ color: "var(--brand)" }}>{product.price.toLocaleString()} P</p>
        </div>
      </div>

      {/* 포인트 정보 + 교환 버튼 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {userPoints !== null ? (
          <>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span style={{ color: "var(--text-secondary)" }}>보유 포인트</span>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>{userPoints.toLocaleString()} P</span>
            </div>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span style={{ color: "var(--text-secondary)" }}>차감 포인트</span>
              <span className="font-bold" style={{ color: "#dc2626" }}>-{product.price.toLocaleString()} P</span>
            </div>
            <div className="h-px my-2" style={{ background: "var(--border)" }} />
            <div className="flex justify-between text-[14px] mb-4">
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>교환 후 잔액</span>
              <span className="font-black" style={{ color: canExchange ? "var(--brand)" : "#dc2626" }}>
                {(userPoints - product.price).toLocaleString()} P
              </span>
            </div>
          </>
        ) : (
          <p className="text-[13px] mb-4" style={{ color: "var(--text-secondary)" }}>로그인 후 교환 가능합니다.</p>
        )}

        {/* 결과 메시지 */}
        {result && (
          <div
            className="text-center text-[13px] font-bold py-2 rounded-lg mb-3"
            style={{ background: result.ok ? "#dcfce7" : "#fee2e2", color: result.ok ? "#16a34a" : "#dc2626" }}
          >
            {result.msg}
          </div>
        )}

        <button
          onClick={handleExchange}
          disabled={exchanging || !canExchange || userPoints === null}
          className="w-full py-3 rounded-lg text-[15px] font-bold text-white transition-transform active:scale-[0.98]"
          style={{
            background: canExchange ? "var(--brand)" : "#d4d4d4",
            cursor: canExchange ? "pointer" : "not-allowed",
          }}
        >
          {exchanging ? "처리중..." : userPoints === null ? "로그인이 필요합니다" : !canExchange ? "포인트가 부족합니다" : "기프티콘 교환 신청"}
        </button>
      </div>

      {/* 내 교환 신청 목록 */}
      <div className="rounded-lg overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>내 교환 신청 목록</span>
          <Link href="/points/exchange" className="text-[11px] font-bold" style={{ color: "var(--brand)" }}>전체보기</Link>
        </div>

        {exchanges.length === 0 ? (
          <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-secondary)" }}>교환 내역이 없습니다.</div>
        ) : (
          <div className="flex flex-col">
            {exchanges.slice(0, 5).map((ex, idx) => {
              const st = STATUS_MAP[ex.status] ?? STATUS_MAP.PENDING;
              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between px-4 py-2.5"
                  style={{ borderTop: idx > 0 ? "1px solid var(--border)" : "none" }}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{ex.productName}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      <span>{formatDate(ex.createdAt)}</span>
                      <span className="font-bold" style={{ color: "var(--brand)" }}>-{ex.amount.toLocaleString()}P</span>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

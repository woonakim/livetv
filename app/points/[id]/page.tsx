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
  const [phoneVerified, setPhoneVerified] = useState(false);
  // 인증 모달
  const [showVerify, setShowVerify] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifySent, setVerifySent] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [verifyCooldown, setVerifyCooldown] = useState(0);
  const [verifying, setVerifying] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch("/api/point-products").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()).catch(() => ({})),
      fetch("/api/point-exchange").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([products, me, exList]) => {
      setProduct(products.find((p: Product) => p.id === id) ?? null);
      if (me.user) { setUserPoints(me.user.points ?? 0); setPhoneVerified(!!me.user.phoneVerified); }
      setExchanges(exList);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleExchange = async () => {
    if (!product || exchanging) return;
    if (!phoneVerified) { setShowVerify(true); return; }
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
        if (data.needVerify) { setShowVerify(true); }
        setResult({ ok: false, msg: data.error });
      } else {
        setResult({ ok: true, msg: `${product.name} 교환 신청이 완료되었습니다!` });
        setUserPoints(prev => prev !== null ? prev - product.price : null);
        fetch("/api/point-exchange").then(r => r.ok ? r.json() : []).then(setExchanges);
      }
    } catch {
      setResult({ ok: false, msg: "서버 오류가 발생했습니다." });
    }
    setExchanging(false);
  };

  const handleSendCode = async () => {
    if (!verifyPhone.trim() || verifyCooldown > 0) return;
    setVerifyMsg("");
    const res = await fetch("/api/auth/phone/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: verifyPhone }),
    });
    const data = await res.json();
    if (!res.ok) { setVerifyMsg(data.error); return; }
    setVerifySent(true);
    setVerifyMsg("인증번호가 발송되었습니다.");
    setVerifyCooldown(60);
    const timer = setInterval(() => {
      setVerifyCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleVerifyCode = async () => {
    if (!verifyCode.trim() || verifying) return;
    setVerifying(true);
    setVerifyMsg("");
    const res = await fetch("/api/auth/phone/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: verifyPhone, code: verifyCode }),
    });
    const data = await res.json();
    if (!res.ok) { setVerifyMsg(data.error); setVerifying(false); return; }
    setPhoneVerified(true);
    setShowVerify(false);
    setVerifyMsg("");
    setVerifying(false);
    setResult({ ok: true, msg: "핸드폰 인증이 완료되었습니다. 교환 버튼을 다시 눌러주세요." });
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

        {/* 교환 성공 시 텔레그램 고객센터 배너 */}
        {result?.ok && result.msg.includes("교환 신청") && (
          <a
            href="https://t.me/LiveTV1004"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg mb-3 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0088cc, #0077b5)", border: "1px solid rgba(0,136,204,0.3)" }}
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white">기프티콘 수령 안내</p>
              <p className="text-[11px] text-white/80">텔레그램 고객센터로 연락해주시면 빠르게 처리해드립니다</p>
            </div>
            <span className="text-white/60 text-[18px] shrink-0">›</span>
          </a>
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

      {/* 핸드폰 인증 모달 */}
      {showVerify && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowVerify(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-[90%] max-w-sm rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>핸드폰 인증</h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>포인트 교환을 위해 핸드폰 인증이 필요합니다.</p>

            {verifyMsg && (
              <div className="text-[12px] font-bold py-2 px-3 rounded mb-3" style={{ background: verifyMsg.includes("완료") || verifyMsg.includes("발송") ? "#dcfce7" : "#fee2e2", color: verifyMsg.includes("완료") || verifyMsg.includes("발송") ? "#16a34a" : "#dc2626" }}>
                {verifyMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>핸드폰 번호</label>
                <input value={verifyPhone} onChange={e => setVerifyPhone(e.target.value)} placeholder="01012345678" maxLength={11}
                  className="w-full h-9 px-3 rounded text-[14px] mb-1.5" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                <button onClick={handleSendCode} disabled={verifyCooldown > 0 || !verifyPhone.trim()}
                  className="w-full h-9 rounded text-[13px] font-bold text-white" style={{ background: verifyCooldown > 0 ? "#9ca3af" : "var(--brand)" }}>
                  {verifyCooldown > 0 ? `${verifyCooldown}초 후 재발송` : verifySent ? "인증번호 재발송" : "인증번호 발송"}
                </button>
              </div>

              {verifySent && (
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>인증번호 6자리</label>
                  <input value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="123456" maxLength={6}
                    className="w-full h-9 px-3 rounded text-[14px] text-center tracking-widest font-mono mb-1.5" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  <button onClick={handleVerifyCode} disabled={verifying || verifyCode.length < 6}
                    className="w-full h-9 rounded text-[13px] font-bold text-white" style={{ background: "var(--brand)" }}>
                    {verifying ? "확인 중..." : "인증 확인"}
                  </button>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>5분 내에 입력해주세요. 5회 실패 시 재발송이 필요합니다.</p>
                </div>
              )}
            </div>

            <button onClick={() => setShowVerify(false)} className="w-full mt-4 py-2 rounded text-[13px] font-bold" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

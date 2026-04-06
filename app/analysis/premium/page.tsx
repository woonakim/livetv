"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SPORT_CATEGORIES } from "@/lib/constants";
import AvatarUpload from "@/components/ui/AvatarUpload";

interface RecentPick {
  match: string;
  pick: string;
  result: string;
  odds: string;
}

interface Pickster {
  id: number;
  name: string;
  avatar: string;
  sport: string;
  rate: string;
  totalPicks: number;
  winPicks: number;
  tier: string;
  monthlyFee: number;
  intro: string;
  recentPicks: RecentPick[];
}

const TIER_STYLES: Record<string, string> = {
  "다이아몬드": "bg-sky-100 text-sky-700 border border-sky-200",
  "플래티넘": "bg-purple-100 text-purple-700 border border-purple-200",
  "골드": "bg-amber-100 text-amber-700 border border-amber-200",
  "실버": "bg-gray-100 text-gray-700 border border-gray-200",
  "브론즈": "bg-orange-100 text-orange-700 border border-orange-200",
};

interface PremiumPost {
  id: number;
  sport: string;
  league: string;
  matchTime: string;
  home: { name: string };
  away: { name: string };
  title: string;
  result: string;
  viewCount: number;
  createdAt: string;
  author: { nickname: string };
}

const RESULT_BADGE: Record<string, { label: string; bg: string }> = {
  WIN: { label: "적중", bg: "#16a34a" },
  LOSS: { label: "실패", bg: "#dc2626" },
  CANCEL: { label: "취소", bg: "#6b7280" },
};

export default function PremiumAnalysisPage() {
  const [picksters, setPicksters] = useState<Pickster[]>([]);
  const [premiumPosts, setPremiumPosts] = useState<PremiumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [applySport, setApplySport] = useState("soccer");
  const [applyIntro, setApplyIntro] = useState("");
  const [applyFee, setApplyFee] = useState(0);
  const [applying, setApplying] = useState(false);
  const [user, setUser] = useState<{ id: number; role: string; nickname: string } | null>(null);
  const [myProfile, setMyProfile] = useState<{ id: number; avatar: string; sport: string; intro: string; isApproved: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setUser(d.user);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/picksters").then(r => r.json()),
      fetch("/api/analysis?premium=true&limit=10").then(r => r.json()),
      fetch("/api/picksters/me").then(r => r.json()),
    ]).then(([p, a, me]) => {
      setPicksters(Array.isArray(p) ? p : []);
      setPremiumPosts(a.items || []);
      if (me) setMyProfile(me);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgRate = picksters.length > 0
    ? Math.round(picksters.reduce((sum, p) => sum + parseInt(p.rate), 0) / picksters.length)
    : 0;

  const handleApply = async () => {
    if (!applyIntro.trim() || applying) return;
    setApplying(true);
    try {
      const res = await fetch("/api/picksters/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport: applySport, intro: applyIntro, monthlyFee: applyFee }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("신청이 완료되었습니다. 관리자 검토 후 승인됩니다.");
        setShowRegisterModal(false);
      } else {
        alert(data.error || "신청 실패");
      }
    } catch {
      alert("네트워크 오류");
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div className="space-y-5">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⭐</span>
                <h1 className="text-xl font-black">프리미엄 분석</h1>
              </div>
              <p className="text-sm opacity-90">전문 픽스터의 검증된 분석 서비스</p>
              <p className="text-xs opacity-75 mt-1">등록된 픽스터 {picksters.length}명 · 평균 적중률 {avgRate}%</p>
            </div>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-lg"
              style={{ background: "var(--surface)", color: "var(--brand)" }}
            >
              픽스터 등록 신청 →
            </button>
          </div>
        </div>

        {/* 내 프로필 수정 (픽스터 본인) */}
        {myProfile && myProfile.isApproved && user && (
          <div className="p-4 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>내 픽스터 프로필</h2>
            <div className="flex items-center gap-4">
              <AvatarUpload
                currentAvatar={myProfile.avatar}
                onUploaded={(newPath) => setMyProfile({ ...myProfile, avatar: newPath })}
              />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{user.nickname}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{myProfile.sport} 전문 · {myProfile.intro?.slice(0, 50)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 픽스터 목록 */}
        <div>
          <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>🏆 등록된 픽스터</h2>
          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</div>
          ) : picksters.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-secondary)" }}>등록된 픽스터가 없습니다.</div>
          ) : (
            <div className="space-y-4">
              {picksters.map((pickster) => (
                <div key={pickster.id} className="p-5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 1px 3px 0 rgba(8,8,8,0.18)" }}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 overflow-hidden" style={{ background: "var(--surface-alt, #f1f5f9)" }}>
                      {pickster.avatar?.startsWith("/") ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={pickster.avatar} alt={pickster.name} className="w-full h-full object-cover" />
                      ) : (
                        pickster.avatar || pickster.name[0]
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-black text-base" style={{ color: "var(--text-primary)" }}>{pickster.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIER_STYLES[pickster.tier] || TIER_STYLES["브론즈"]}`}>
                          {pickster.tier}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{pickster.sport}</span>
                      </div>
                      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{pickster.intro}</p>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-black" style={{ color: "var(--brand)" }}>{pickster.rate}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>적중률</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{pickster.totalPicks}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>총 픽수</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black text-green-600">{pickster.winPicks}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>적중</p>
                        </div>
                        <div className="flex-1" />
                        <div className="text-right">
                          <p className="text-base font-black text-green-600">{pickster.monthlyFee > 0 ? `${pickster.monthlyFee.toLocaleString()}원` : "무료"}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>월 구독료</p>
                        </div>
                      </div>

                      {pickster.recentPicks.length > 0 && (
                        <div className="rounded-xl p-3" style={{ background: "var(--surface-alt, #f1f5f9)" }}>
                          <p className="text-xs font-bold mb-2" style={{ color: "var(--text-secondary)" }}>최근 픽</p>
                          <div className="space-y-1.5">
                            {pickster.recentPicks.map((pick, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{pick.match}</span>
                                <span className="mx-2" style={{ color: "var(--text-secondary)" }}>{pick.pick}</span>
                                <span className="mr-2" style={{ color: "var(--text-secondary)" }}>배당 {pick.odds}</span>
                                <span className={`font-bold ${pick.result === "적중" ? "text-green-600" : "text-red-500"}`}>
                                  {pick.result === "적중" ? "✓" : "✗"} {pick.result}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 프리미엄 분석글 */}
        <div>
          <h2 className="text-sm font-black mb-3" style={{ color: "var(--text-primary)" }}>📊 프리미엄 분석글</h2>
          {premiumPosts.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>프리미엄 분석글이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {premiumPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/analysis/${post.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "var(--brand)" }}>{post.league}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#d97706" }}>PRO</span>
                      {post.result !== "PENDING" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: RESULT_BADGE[post.result]?.bg ?? "#6b7280" }}>
                          {RESULT_BADGE[post.result]?.label ?? post.result}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{post.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: "var(--text-secondary)" }}>
                      <span>✍️ {post.author.nickname}</span>
                      <span>{post.home.name}{post.away.name ? ` vs ${post.away.name}` : ""}</span>
                      <span>👁 {post.viewCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 픽스터 등록 모달 */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowRegisterModal(false)}>
            <div className="rounded-2xl p-6 max-w-md w-full shadow-2xl" style={{ background: "var(--surface)" }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg" style={{ color: "var(--text-primary)" }}>픽스터 등록 신청</h2>
                <button onClick={() => setShowRegisterModal(false)} className="text-xl" style={{ color: "var(--text-secondary)" }}>✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>전문 종목</label>
                  <select value={applySport} onChange={e => setApplySport(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    {SPORT_CATEGORIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>자기소개</label>
                  <textarea value={applyIntro} onChange={e => setApplyIntro(e.target.value)} rows={3} placeholder="경력 및 전문성 소개" className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>월 구독료</label>
                  <select value={applyFee} onChange={e => setApplyFee(parseInt(e.target.value))} className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                    <option value={0}>무료</option>
                    <option value={10000}>10,000원</option>
                    <option value={20000}>20,000원</option>
                    <option value={30000}>30,000원</option>
                    <option value={50000}>50,000원</option>
                  </select>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  픽스터 등록 후 관리자 검토(1~2일)를 거쳐 승인됩니다.
                </div>
                <button onClick={handleApply} disabled={applying} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "var(--brand)", opacity: applying ? 0.6 : 1 }}>
                  {applying ? "신청 중..." : "신청하기"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

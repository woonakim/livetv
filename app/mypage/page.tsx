"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ROLE_LABEL: Record<string, string> = {
  USER: "일반회원", PICKSTER: "픽스터", BJ: "BJ", ADMIN: "관리자", SUPERADMIN: "최고관리자",
};
const ROLE_COLOR: Record<string, string> = {
  USER: "#6b7280", PICKSTER: "#3b82f6", BJ: "#a855f7", ADMIN: "#dc2626", SUPERADMIN: "#dc2626",
};

interface UserInfo {
  id: number; username: string; nickname: string; role: string;
  points: number; exp: number; phone: string | null; phoneVerified: boolean; birthDate: string | null; referredBy: string | null; createdAt: string;
}

interface LevelRow {
  level: number; name: string; requiredExp: number; badge: string; color: string; bgColor: string;
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 비밀번호 변경
  const [showPwModal, setShowPwModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // BJ 신청
  const [bjProfile, setBjProfile] = useState<{ isApproved: boolean; streamKey: string } | null>(null);
  const [bjApplying, setBjApplying] = useState(false);

  // 픽스터 상태
  const [picksterProfile, setPicksterProfile] = useState<{ isApproved: boolean } | null>(null);

  // 핸드폰 인증
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [vPhone, setVPhone] = useState("");
  const [vCode, setVCode] = useState("");
  const [vSent, setVSent] = useState(false);
  const [vMsg, setVMsg] = useState("");
  const [vCooldown, setVCooldown] = useState(0);
  const [vLoading, setVLoading] = useState(false);

  // 생년월일 등록
  const [showBirthModal, setShowBirthModal] = useState(false);
  const [birthInput, setBirthInput] = useState("");
  const [birthSaving, setBirthSaving] = useState(false);

  // VIP 등급표
  const [showVipModal, setShowVipModal] = useState(false);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const refetchLevels = () => {
    fetch("/api/levels", { cache: "no-store" }).then(r => r.json()).then(d => { if (Array.isArray(d)) setLevels(d); }).catch(() => {});
  };

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (!d.user) { router.push("/"); return; }
      setUser(d.user);
    }).catch(() => router.push("/")).finally(() => setLoading(false));

    fetch("/api/bj/me").then(r => r.json()).then(d => { if (d) setBjProfile(d); }).catch(() => {});
    fetch("/api/picksters/me").then(r => r.json()).then(d => { if (d) setPicksterProfile(d); }).catch(() => {});
    fetch("/api/levels").then(r => r.json()).then(d => { if (Array.isArray(d)) setLevels(d); }).catch(() => {});
  }, [router]);

  const handleBirthSave = async () => {
    if (birthSaving || !birthInput) return;
    setBirthSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: birthInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => prev ? { ...prev, birthDate: birthInput } : prev);
        setShowBirthModal(false);
        alert("생년월일이 등록되었습니다. 이후 변경은 관리자에게 문의해주세요.");
      } else {
        alert(data.error || "저장 실패");
      }
    } catch { alert("네트워크 오류"); }
    finally { setBirthSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (pwSaving) return;
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw, confirmPassword: confirmPw }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("비밀번호가 변경되었습니다");
        setShowPwModal(false); setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        alert(data.error || "변경 실패");
      }
    } catch { alert("네트워크 오류"); }
    finally { setPwSaving(false); }
  };

  const handleBjApply = async () => {
    if (bjApplying) return;
    setBjApplying(true);
    try {
      const res = await fetch("/api/bj/apply", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert("BJ 신청이 완료되었습니다. 관리자 승인 후 방송이 가능합니다.");
        fetch("/api/bj/me").then(r => r.json()).then(d => { if (d) setBjProfile(d); });
      } else {
        alert(data.error || "신청 실패");
      }
    } catch { alert("네트워크 오류"); }
    finally { setBjApplying(false); }
  };

  const handlePhoneSend = async () => {
    if (!vPhone.trim() || vCooldown > 0) return;
    setVMsg("");
    const res = await fetch("/api/auth/phone/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: vPhone }) });
    const data = await res.json();
    if (!res.ok) { setVMsg(data.error); return; }
    setVSent(true);
    setVMsg("인증번호가 발송되었습니다.");
    setVCooldown(60);
    const timer = setInterval(() => { setVCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; }); }, 1000);
  };

  const handlePhoneVerify = async () => {
    if (!vCode.trim() || vLoading) return;
    setVLoading(true); setVMsg("");
    const res = await fetch("/api/auth/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: vPhone, code: vCode }) });
    const data = await res.json();
    if (!res.ok) { setVMsg(data.error); setVLoading(false); return; }
    setShowPhoneModal(false); setVMsg(""); setVLoading(false);
    // 유저 정보 갱신
    const me = await fetch("/api/auth/me").then(r => r.json());
    if (me.user) setUser(me.user);
    alert("휴대폰 인증이 완료되었습니다.");
  };

  if (loading) return <div className="p-8 text-center"><div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "2px solid var(--border)", borderTopColor: "var(--brand)" }} /></div>;
  if (!user) return null;

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div className="w-full p-4 space-y-4">
      <h1 className="text-xl font-black" style={{ color: "var(--brand)" }}>마이페이지</h1>

      {/* 프로필 카드 */}
      <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, var(--brand), #0284c7)", color: "#fff" }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black" style={{ background: "rgba(255,255,255,0.2)" }}>
            {user.nickname[0]}
          </div>
          <div>
            <p className="text-xl font-black">{user.nickname}</p>
            <p className="text-sm opacity-80">@{user.username}</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: "rgba(255,255,255,0.2)" }}>
              {ROLE_LABEL[user.role] || user.role}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <p className="text-2xl font-black">{(user.points || 0).toLocaleString()}</p>
            <p className="text-xs opacity-75">포인트</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{(user.exp || 0).toLocaleString()}</p>
            <p className="text-xs opacity-75">경험치</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black">{user.referredBy || "-"}</p>
            <p className="text-xs opacity-75">추천인</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <button onClick={() => setShowPwModal(true)} className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}><i className="fas fa-lock w-4 text-center" />비밀번호 변경</span>
          <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
        </button>

        <button onClick={() => setShowPhoneModal(true)} className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            <i className="fas fa-mobile-screen-button w-4 text-center" />
            휴대폰 인증
            {user.phoneVerified
              ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#dcfce7", color: "#16a34a" }}>인증완료</span>
              : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#fee2e2", color: "#dc2626" }}>미인증</span>
            }
          </span>
          <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
        </button>

        <button onClick={() => { if (!user.birthDate) setShowBirthModal(true); }} className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            <i className="fas fa-cake-candles w-4 text-center" />
            생년월일
            {user.birthDate
              ? <span className="text-[10px] font-normal ml-2" style={{ color: "var(--text-secondary)" }}>{user.birthDate.slice(0, 10)}</span>
              : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#fef3c7", color: "#92400e" }}>미등록</span>
            }
          </span>
          {!user.birthDate && <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />}
        </button>

        <button onClick={() => { refetchLevels(); setShowVipModal(true); }} className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}><i className="fas fa-crown w-4 text-center" style={{ color: "#f59e0b" }} />VIP 등급표</span>
          <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
        </button>

        <Link href="/attendance" className="flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}><i className="fas fa-calendar-check w-4 text-center" />출석체크</span>
          <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
        </Link>

        <Link href="/points" className="flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}><i className="fas fa-coins w-4 text-center" />포인트 전환</span>
          <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
        </Link>

        {user.role === "PICKSTER" && (
          <Link href="/analysis/premium" className="flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}><i className="fas fa-chart-line w-4 text-center" />픽스터 프로필</span>
            <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
          </Link>
        )}

        {bjProfile && (
          <Link href="/bj/dashboard" className="flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              <i className="fas fa-video w-4 text-center" />
              BJ 대시보드
              {!bjProfile.isApproved && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#fef3c7", color: "#92400e" }}>승인대기</span>}
              {bjProfile.isApproved && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1" style={{ background: "#dcfce7", color: "#16a34a" }}>승인됨</span>}
            </span>
            <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
          </Link>
        )}

        {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
          <Link href="/admin" className="flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
            <span className="flex items-center gap-3 text-sm font-bold" style={{ color: "#dc2626" }}><i className="fas fa-gear w-4 text-center" />관리자 페이지</span>
            <i className="fas fa-chevron-right text-[10px]" style={{ color: "var(--text-secondary)" }} />
          </Link>
        )}
      </div>

      {/* BJ/픽스터 신청 */}
      <div className="rounded-lg p-4 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>활동 신청</h2>

        {/* 픽스터 */}
        {!picksterProfile ? (
          <Link href="/analysis/premium" className="flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:opacity-80" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span className="text-[12px] font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-chart-line" />픽스터 등록 신청</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "var(--brand)", color: "#fff" }}>신청</span>
          </Link>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span className="text-[12px] font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-chart-line" />픽스터</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: picksterProfile.isApproved ? "#dcfce7" : "#fef3c7", color: picksterProfile.isApproved ? "#16a34a" : "#92400e" }}>
              {picksterProfile.isApproved ? "승인됨" : "대기중"}
            </span>
          </div>
        )}

        {/* BJ */}
        {!bjProfile ? (
          <button onClick={handleBjApply} disabled={bjApplying} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:opacity-80" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span className="text-[12px] font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-video" />BJ 등록 신청</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "#a855f7", color: "#fff" }}>{bjApplying ? "신청중..." : "신청"}</span>
          </button>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <span className="text-[12px] font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-video" />BJ</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: bjProfile.isApproved ? "#dcfce7" : "#fef3c7", color: bjProfile.isApproved ? "#16a34a" : "#92400e" }}>
              {bjProfile.isApproved ? "승인됨" : "대기중"}
            </span>
          </div>
        )}
      </div>

      {/* 가입 정보 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>가입 정보</h2>
        <div className="space-y-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          <p>아이디: <strong style={{ color: "var(--text-primary)" }}>{user.username}</strong></p>
          <p>등급: <strong style={{ color: ROLE_COLOR[user.role] }}>{ROLE_LABEL[user.role]}</strong></p>
          <p>가입일: <strong style={{ color: "var(--text-primary)" }}>{new Date(user.createdAt).toLocaleDateString("ko-KR")}</strong></p>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPwModal(false)}>
          <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: "var(--surface)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-lock" />비밀번호 변경</h2>
              <button onClick={() => setShowPwModal(false)} className="text-lg" style={{ color: "var(--text-secondary)" }}>✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>현재 비밀번호</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>새 비밀번호</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="6자 이상" className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>새 비밀번호 확인</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full rounded-lg px-3 py-2 text-sm" style={inputStyle} />
              </div>
              <button onClick={handlePasswordChange} disabled={pwSaving} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "var(--brand)", opacity: pwSaving ? 0.6 : 1 }}>
                {pwSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 휴대폰 인증 모달 */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowPhoneModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-[90%] max-w-sm rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>휴대폰 인증</h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>
              {user.phoneVerified ? "이미 인증되었습니다. 번호를 변경하려면 재인증해주세요." : "포인트 교환을 위해 휴대폰 인증이 필요합니다."}
            </p>

            {vMsg && (
              <div className="text-[12px] font-bold py-2 px-3 rounded mb-3" style={{ background: vMsg.includes("발송") || vMsg.includes("완료") ? "#dcfce7" : "#fee2e2", color: vMsg.includes("발송") || vMsg.includes("완료") ? "#16a34a" : "#dc2626" }}>
                {vMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>핸드폰 번호</label>
                <input value={vPhone} onChange={e => setVPhone(e.target.value)} placeholder="01012345678" maxLength={11}
                  className="w-full h-9 px-3 rounded text-[14px] mb-1.5" style={inputStyle} />
                <button onClick={handlePhoneSend} disabled={vCooldown > 0 || !vPhone.trim()}
                  className="w-full h-9 rounded text-[13px] font-bold text-white" style={{ background: vCooldown > 0 ? "#9ca3af" : "var(--brand)" }}>
                  {vCooldown > 0 ? `${vCooldown}초 후 재발송` : vSent ? "인증번호 재발송" : "인증번호 발송"}
                </button>
              </div>

              {vSent && (
                <div>
                  <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>인증번호 6자리</label>
                  <input value={vCode} onChange={e => setVCode(e.target.value)} placeholder="123456" maxLength={6}
                    className="w-full h-9 px-3 rounded text-[14px] text-center tracking-widest font-mono mb-1.5" style={inputStyle} />
                  <button onClick={handlePhoneVerify} disabled={vLoading || vCode.length < 6}
                    className="w-full h-9 rounded text-[13px] font-bold text-white" style={{ background: "var(--brand)" }}>
                    {vLoading ? "확인 중..." : "인증 확인"}
                  </button>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>5분 내에 입력해주세요.</p>
                </div>
              )}
            </div>

            <button onClick={() => setShowPhoneModal(false)} className="w-full mt-4 py-2 rounded text-[13px] font-bold" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 생년월일 등록 모달 */}
      {showBirthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setShowBirthModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-[90%] max-w-sm rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-cake-candles" />생년월일 등록</h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>
              생일 보상을 받으려면 등록이 필요합니다. <strong>1회 등록 후 변경은 관리자만 가능</strong>합니다.
            </p>
            <input
              type="date"
              value={birthInput}
              onChange={(e) => setBirthInput(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full h-10 px-3 rounded text-[14px] mb-4"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowBirthModal(false)} className="flex-1 py-2 rounded text-[13px] font-bold" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                취소
              </button>
              <button onClick={handleBirthSave} disabled={birthSaving || !birthInput} className="flex-1 py-2 rounded text-[13px] font-bold text-white" style={{ background: "var(--brand)", opacity: !birthInput ? 0.5 : 1 }}>
                {birthSaving ? "저장 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP 등급표 모달 */}
      {showVipModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowVipModal(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full max-w-md rounded-2xl p-5 max-h-[80vh] overflow-y-auto" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><i className="fas fa-crown" style={{ color: "#f59e0b" }} />VIP 등급표</h3>
            <p className="text-[12px] mb-4" style={{ color: "var(--text-secondary)" }}>
              현재 경험치: <strong>{user.exp.toLocaleString()} EXP</strong>
            </p>
            {levels.length === 0 ? (
              <p className="text-center text-sm py-8" style={{ color: "var(--text-secondary)" }}>등급 정보가 없습니다.</p>
            ) : (
              <div className="space-y-1.5">
                {levels.map((lv) => {
                  const reached = user.exp >= lv.requiredExp;
                  return (
                    <div key={lv.level} className="flex items-center justify-between rounded-lg px-3 py-2" style={{
                      background: reached ? (lv.bgColor || "var(--bg)") : "var(--bg)",
                      border: `1px solid ${reached ? (lv.color || "var(--border)") : "var(--border)"}`,
                      opacity: reached ? 1 : 0.6,
                    }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black" style={{ color: lv.color || "var(--text-primary)" }}>
                          {lv.badge || `Lv.${lv.level}`}
                        </span>
                        <div>
                          <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{lv.name || `레벨 ${lv.level}`}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>필요: {lv.requiredExp.toLocaleString()} EXP</p>
                        </div>
                      </div>
                      {reached && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#dcfce7", color: "#16a34a" }}>달성</span>}
                    </div>
                  );
                })}
              </div>
            )}
            <button onClick={() => setShowVipModal(false)} className="w-full mt-4 py-2 rounded text-[13px] font-bold" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              닫기
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

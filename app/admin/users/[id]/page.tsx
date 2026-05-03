"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const ROLE_OPTIONS = [
  { value: "USER", label: "일반" },
  { value: "PICKSTER", label: "픽스터" },
  { value: "BJ", label: "BJ" },
  { value: "ADMIN", label: "관리자" },
  { value: "SUPERADMIN", label: "최고관리자" },
];

const ROLE_COLOR: Record<string, string> = {
  USER: "#6b7280", PICKSTER: "#3b82f6", BJ: "#8b5cf6", ADMIN: "#f59e0b", SUPERADMIN: "#ef4444",
};

interface UserDetail {
  id: number; username: string; nickname: string; role: string;
  points: number; exp: number; isActive: boolean;
  name: string | null; phone: string | null; phoneVerified: boolean; email: string | null; referredBy: string | null;
  birthDate: string | null; adminMemo: string;
  lastLoginAt: string | null;
  createdAt: string; updatedAt: string;
  level: { level: number; name: string; badge: string; color: string; bgColor: string; nextRequired: number | null; toNext: number | null };
  suspicion: { score: number; reasons: string[] };
  pyramid: {
    upChain: { id: number; nickname: string; role: string; createdAt: string; isActive: boolean }[];
    downChildren: { id: number; nickname: string; role: string; createdAt: string; isActive: boolean; childCount: number }[];
  };
  counts: { mainChats: number; bjChats: number; totalChats: number; attendances: number; exchanges: number; analyses: number; logins: number; visits: number; chatBans: number };
  lastLogin: { createdAt: string; ip: string; device: string; browser: string; os: string } | null;
  lastVisit: { createdAt: string; ip: string; path: string } | null;
  eventStats: { eventStreak: number; eventBestStreak: number };
}

type Tab = "points" | "chats" | "attendance" | "exchanges" | "access" | "duplicate-ip" | "phone-logs" | "admin-logs" | "chat-bans" | "analyses" | "heatmap";

const TABS: { key: Tab; label: string }[] = [
  { key: "points", label: "포인트" },
  { key: "chats", label: "채팅" },
  { key: "attendance", label: "출석" },
  { key: "exchanges", label: "교환" },
  { key: "access", label: "접속/로그인" },
  { key: "duplicate-ip", label: "중복 IP" },
  { key: "phone-logs", label: "인증" },
  { key: "admin-logs", label: "관리자" },
  { key: "chat-bans", label: "차단" },
  { key: "analyses", label: "분석글" },
  { key: "heatmap", label: "활동" },
];

function fmt(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function fmtRel(d: string | null) {
  if (!d) return "-";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}일 전`;
  return fmt(d);
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("points");

  // 편집 상태
  const [role, setRole] = useState("");
  const [pointAmount, setPointAmount] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expReason, setExpReason] = useState("");
  const [nickname, setNickname] = useState("");
  const [adminMemo, setAdminMemo] = useState("");

  const refresh = useCallback(() => {
    fetch(`/api/admin/users/${id}`).then(r => r.json()).then(d => {
      if (d.error) { router.push("/admin/users"); return; }
      setUser(d);
      setRole(d.role);
      setNickname(d.nickname);
      setAdminMemo(d.adminMemo || "");
    });
  }, [id, router]);

  useEffect(() => { refresh(); }, [refresh]);

  const save = async (data: Record<string, unknown>) => {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.ok) {
      setMsg("저장되었습니다.");
      refresh();
    } else {
      setMsg(result.error || "오류");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleForceLogout = async () => {
    if (!confirm("이 회원의 모든 활성 세션을 무효화합니다 (강제 로그아웃).\n계속하시겠습니까?")) return;
    const res = await fetch(`/api/admin/users/${id}/force-logout`, { method: "POST" });
    const j = await res.json();
    alert(j.note || j.error || "처리됨");
    refresh();
  };

  const handleResetPassword = async () => {
    if (!confirm("이 회원의 비밀번호를 '1234'로 초기화합니다.\n계속하시겠습니까?")) return;
    save({ resetPassword: true });
  };

  const handleBan = async () => {
    const reason = prompt("차단 사유를 입력하세요 (메모에 기록됩니다)");
    if (reason === null) return;
    const banIps = confirm("이 회원이 사용한 IP도 함께 차단하시겠습니까?\n(취소를 누르면 IP는 차단하지 않고 계정만 잠급니다)");
    const res = await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, banIps }),
    });
    const j = await res.json();
    alert(j.note || j.error || "처리됨");
    refresh();
  };

  const handleUnban = async () => {
    if (!confirm("이 회원의 차단을 해제하시겠습니까?")) return;
    const unbanIps = confirm("차단된 IP도 함께 해제하시겠습니까?\n(취소를 누르면 IP 차단은 유지됩니다)");
    const res = await fetch(`/api/admin/users/${id}/ban${unbanIps ? "?unbanIps=1" : ""}`, { method: "DELETE" });
    const j = await res.json();
    if (j.ok) {
      alert(`차단 해제됨${j.unbanIpCount ? ` (IP ${j.unbanIpCount}개 해제)` : ""}`);
      refresh();
    }
    else alert(j.error || "오류");
  };

  if (!user) return <p className="text-sm text-gray-400">로딩중...</p>;

  const lvlBg = user.level.bgColor || "#f3f4f6";
  const lvlColor = user.level.color || "#374151";
  const lvlBadge = user.level.badge || "Lv";
  const lvlName = user.level.name || `Lv ${user.level.level}`;
  const expProgress = user.level.nextRequired ? Math.max(0, Math.min(100, (user.exp / user.level.nextRequired) * 100)) : 100;

  const suspBg = user.suspicion.score >= 50 ? "#fef2f2" : user.suspicion.score >= 25 ? "#fffbeb" : "#f0fdf4";
  const suspColor = user.suspicion.score >= 50 ? "#dc2626" : user.suspicion.score >= 25 ? "#d97706" : "#16a34a";
  const suspLabel = user.suspicion.score >= 50 ? "위험" : user.suspicion.score >= 25 ? "주의" : "정상";

  return (
    <div>
      {/* breadcrumb */}
      <div className="flex items-center gap-3 mb-3">
        <Link href="/admin/users" className="text-[12px] text-gray-500 hover:text-gray-700">회원 관리</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-bold text-gray-800">{user.nickname}</span>
        <span className="text-[11px] text-gray-400">#{user.id}</span>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {/* 2-column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-5 space-y-3">
          {/* 프로필 카드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-black text-gray-900">{user.nickname}</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: `${ROLE_COLOR[user.role]}15`, color: ROLE_COLOR[user.role] }}>
                    {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: user.isActive ? "#16a34a" : "#dc2626" }}>{user.isActive ? "활성" : "비활성"}</span>
                </div>
                <p className="text-[11px] text-gray-500">{user.username} · 가입 {fmtRel(user.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">마지막 로그인</p>
                <p className="text-[11px] font-bold text-gray-700">{fmtRel(user.lastLoginAt)}</p>
              </div>
            </div>

            {/* 레벨 + 포인트 */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md p-2" style={{ background: lvlBg, border: `1px solid ${lvlColor}30` }}>
                <p className="text-[9px] font-bold opacity-60" style={{ color: lvlColor }}>레벨</p>
                <p className="text-sm font-black" style={{ color: lvlColor }}>{lvlBadge} {user.level.level}</p>
                <p className="text-[10px] font-bold" style={{ color: lvlColor }}>{lvlName}</p>
                {user.level.toNext != null && (
                  <div className="mt-1 h-1 bg-white rounded overflow-hidden">
                    <div className="h-full" style={{ width: `${expProgress}%`, background: lvlColor }} />
                  </div>
                )}
              </div>
              <div className="rounded-md p-2 bg-blue-50 border border-blue-100">
                <p className="text-[9px] font-bold text-blue-600 opacity-70">포인트</p>
                <p className="text-sm font-black text-blue-600">{user.points.toLocaleString()}</p>
              </div>
              <div className="rounded-md p-2 bg-purple-50 border border-purple-100">
                <p className="text-[9px] font-bold text-purple-600 opacity-70">EXP</p>
                <p className="text-sm font-black text-purple-600">{user.exp.toLocaleString()}</p>
                {user.level.toNext != null && <p className="text-[9px] text-purple-400">+{user.level.toNext.toLocaleString()}</p>}
              </div>
            </div>

            {/* 기본 정보 — 컴팩트 */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 pt-3 border-t border-gray-100 text-[11px]">
              <Field label="이름" value={user.name} />
              <Field label="이메일" value={user.email} />
              <Field label="전화" value={
                user.phone ? <>{user.phone} <span className={`text-[9px] font-bold ml-1 ${user.phoneVerified ? "text-green-600" : "text-red-500"}`}>{user.phoneVerified ? "✓" : "✗"}</span></> : "-"
              } />
              <Field label="추천인" value={user.referredBy} />
              <Field label="생년월일" value={user.birthDate} />
              <Field label="이벤트연승" value={`${user.eventStats.eventStreak} (최고 ${user.eventStats.eventBestStreak})`} />
            </div>
          </div>

          {/* 통계 격자 — 클릭하면 우측 탭 전환 */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-[11px] font-bold text-gray-500 mb-2">활동 통계</h3>
            <div className="grid grid-cols-3 gap-1.5">
              <StatBtn active={tab === "chats"} onClick={() => setTab("chats")} label="채팅" value={user.counts.totalChats} />
              <StatBtn active={tab === "attendance"} onClick={() => setTab("attendance")} label="출석" value={`${user.counts.attendances}일`} />
              <StatBtn active={tab === "exchanges"} onClick={() => setTab("exchanges")} label="교환" value={user.counts.exchanges} />
              <StatBtn active={tab === "access"} onClick={() => setTab("access")} label="로그인" value={`${user.counts.logins}회`} />
              <StatBtn active={tab === "access"} onClick={() => setTab("access")} label="접속" value={`${user.counts.visits}회`} />
              <StatBtn active={tab === "phone-logs"} onClick={() => setTab("phone-logs")} label="인증" value={`-`} />
              <StatBtn active={tab === "analyses"} onClick={() => setTab("analyses")} label="분석글" value={user.counts.analyses} />
              <StatBtn active={tab === "chat-bans"} onClick={() => setTab("chat-bans")} label="차단" value={user.counts.chatBans} />
              <StatBtn active={tab === "points"} onClick={() => setTab("points")} label="포인트" value="▶" />
            </div>
          </div>

          {/* 위험 표시 */}
          <div className="rounded-lg border p-3" style={{ background: suspBg, borderColor: `${suspColor}30` }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[12px] font-bold" style={{ color: suspColor }}>다중 계정 의심도</h3>
              <span className="text-[11px] font-black" style={{ color: suspColor }}>{user.suspicion.score} ({suspLabel})</span>
            </div>
            <div className="h-1.5 bg-white rounded overflow-hidden mb-2">
              <div className="h-full" style={{ width: `${user.suspicion.score}%`, background: suspColor }} />
            </div>
            {user.suspicion.reasons.length > 0 ? (
              <ul className="text-[10px] space-y-0.5" style={{ color: suspColor }}>
                {user.suspicion.reasons.map((r, i) => <li key={i}>· {r}</li>)}
              </ul>
            ) : (
              <p className="text-[10px]" style={{ color: suspColor }}>의심 신호 없음</p>
            )}
            <button onClick={() => setTab("duplicate-ip")} className="mt-2 text-[10px] font-bold underline" style={{ color: suspColor }}>중복 IP 상세 보기 ▶</button>
          </div>

          {/* 추천 피라미드 */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-[11px] font-bold text-gray-500 mb-2">추천 피라미드</h3>
            {/* 상위 체인 */}
            {user.pyramid.upChain.length > 0 ? (
              <div className="space-y-1 mb-2">
                {user.pyramid.upChain.slice().reverse().map((u, i) => (
                  <div key={u.id} className="flex items-center text-[11px]" style={{ paddingLeft: `${i * 8}px` }}>
                    <span className="text-gray-400 mr-1">{"└"}</span>
                    <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline font-semibold">{u.nickname}</Link>
                    <span className="text-[9px] text-gray-400 ml-1">Lv{user.pyramid.upChain.length - i}</span>
                  </div>
                ))}
                <div className="flex items-center text-[11px] font-bold" style={{ paddingLeft: `${user.pyramid.upChain.length * 8}px` }}>
                  <span className="text-amber-500 mr-1">★</span>
                  <span className="text-gray-900">{user.nickname}</span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 mb-2">상위 추천인 없음</p>
            )}
            {/* 하위 */}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[10px] font-bold text-gray-500 mb-1">추천한 회원 ({user.pyramid.downChildren.length})</p>
              {user.pyramid.downChildren.length === 0 ? (
                <p className="text-[10px] text-gray-400">없음</p>
              ) : (
                <div className="space-y-0.5 max-h-32 overflow-auto">
                  {user.pyramid.downChildren.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-[11px]">
                      <Link href={`/admin/users/${c.id}`} className="text-blue-600 hover:underline">{c.nickname}</Link>
                      <span className="text-[9px] text-gray-400">{c.childCount > 0 ? `+${c.childCount}` : ""} {fmtRel(c.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <h3 className="text-[11px] font-bold text-gray-500">빠른 액션</h3>

            {/* 닉네임 변경 */}
            <div>
              <label className="text-[10px] text-gray-500">닉네임</label>
              <div className="flex gap-1 mt-0.5">
                <input value={nickname} onChange={e => setNickname(e.target.value)} className="h-7 flex-1 px-2 text-[12px] border border-gray-300 rounded" />
                <button onClick={() => save({ nickname: nickname.trim() })} disabled={saving || nickname === user.nickname} className="h-7 px-2 bg-gray-800 text-white text-[10px] font-bold rounded disabled:opacity-40">변경</button>
              </div>
            </div>

            {/* 등급 변경 */}
            <div className="flex gap-1">
              <select value={role} onChange={e => setRole(e.target.value)} className="h-7 flex-1 px-1 text-[11px] border border-gray-300 rounded">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={() => save({ role })} disabled={saving || role === user.role} className="h-7 px-3 bg-gray-800 text-white text-[10px] font-bold rounded disabled:opacity-40">등급 변경</button>
            </div>

            {/* 포인트 / EXP 조정 */}
            <div className="flex gap-1">
              <input type="number" value={pointAmount} onChange={e => setPointAmount(e.target.value)} placeholder="포인트 ±" className="h-7 w-20 px-2 text-[11px] border border-gray-300 rounded" />
              <input value={pointReason} onChange={e => setPointReason(e.target.value)} placeholder="사유" className="h-7 flex-1 px-2 text-[11px] border border-gray-300 rounded" />
              <button onClick={() => { const a = parseInt(pointAmount); if (!a) return; save({ pointAdjust: { amount: a, reason: pointReason || "관리자 수동 조정" } }); setPointAmount(""); setPointReason(""); }} disabled={saving || !pointAmount} className="h-7 px-2 bg-blue-600 text-white text-[10px] font-bold rounded disabled:opacity-40">P</button>
            </div>
            <div className="flex gap-1">
              <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="EXP ±" className="h-7 w-20 px-2 text-[11px] border border-gray-300 rounded" />
              <input value={expReason} onChange={e => setExpReason(e.target.value)} placeholder="사유" className="h-7 flex-1 px-2 text-[11px] border border-gray-300 rounded" />
              <button onClick={() => { const a = parseInt(expAmount); if (!a) return; save({ expAdjust: { amount: a, reason: expReason || "관리자 수동 조정" } }); setExpAmount(""); setExpReason(""); }} disabled={saving || !expAmount} className="h-7 px-2 bg-purple-600 text-white text-[10px] font-bold rounded disabled:opacity-40">E</button>
            </div>

            {/* 보안 액션 — 3개 버튼 분리 */}
            <div className="border-t border-gray-100 pt-2 mt-1 space-y-1">
              <p className="text-[10px] font-bold text-gray-500">보안 / 제재</p>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={handleResetPassword} disabled={saving} title="비밀번호를 1234로 초기화"
                  className="h-7 bg-gray-600 text-white text-[10px] font-bold rounded">
                  🔑 PW 1234로 초기화
                </button>
                <button onClick={handleForceLogout} title="모든 활성 세션 즉시 무효화 (PW 변경 X)"
                  className="h-7 bg-orange-500 text-white text-[10px] font-bold rounded">
                  🚪 강제 로그아웃
                </button>
              </div>
              {user.isActive ? (
                <button onClick={handleBan} title="IP 차단 + 계정 잠금 + 즉시 로그아웃 + 사유 기록"
                  className="w-full h-8 bg-red-600 text-white text-[11px] font-bold rounded">
                  🚫 차단 (IP차단 + 계정 잠금 + 로그아웃)
                </button>
              ) : (
                <button onClick={handleUnban} title="차단 해제 — 계정 활성화 + IP 차단 해제 옵션"
                  className="w-full h-8 bg-green-600 text-white text-[11px] font-bold rounded">
                  ✅ 차단 해제
                </button>
              )}
            </div>
          </div>

          {/* 관리자 메모 */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h3 className="text-[11px] font-bold text-gray-500 mb-1">관리자 메모</h3>
            <textarea value={adminMemo} onChange={e => setAdminMemo(e.target.value)} rows={3} placeholder="비활성화 사유, 특이사항, 다중계정 의심 등 기록" className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded resize-none" />
            <button onClick={() => save({ adminMemo })} disabled={saving || adminMemo === (user.adminMemo || "")} className="mt-1 w-full h-7 bg-gray-700 text-white text-[10px] font-bold rounded disabled:opacity-40">메모 저장</button>
          </div>
        </div>

        {/* RIGHT — 탭 패널 */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-lg border border-gray-200">
            {/* 탭 */}
            <div className="border-b border-gray-200 px-2 py-1 flex flex-wrap gap-0.5">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-1.5 text-[12px] font-bold rounded transition-colors ${tab === t.key ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                >{t.label}</button>
              ))}
            </div>
            <div className="p-3">
              <TabPanel userId={parseInt(id)} tab={tab} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-gray-400 mr-1">{label}</span>
      <span className="text-gray-700 font-semibold">{value || "-"}</span>
    </div>
  );
}

function StatBtn({ label, value, active, onClick }: { label: string; value: number | string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-left p-2 rounded border transition-colors ${active ? "bg-gray-900 text-white border-gray-900" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}>
      <p className={`text-[9px] font-bold ${active ? "text-gray-300" : "text-gray-500"}`}>{label}</p>
      <p className={`text-sm font-black ${active ? "text-white" : "text-gray-900"}`}>{value}</p>
    </button>
  );
}

// ─────────────────────── TAB PANEL ───────────────────────

function TabPanel({ userId, tab }: { userId: number; tab: Tab }) {
  switch (tab) {
    case "points": return <PointsTab userId={userId} />;
    case "chats": return <ChatsTab userId={userId} />;
    case "attendance": return <AttendanceTab userId={userId} />;
    case "exchanges": return <ExchangesTab userId={userId} />;
    case "access": return <AccessTab userId={userId} />;
    case "duplicate-ip": return <DuplicateIpTab userId={userId} />;
    case "phone-logs": return <PhoneLogsTab userId={userId} />;
    case "admin-logs": return <AdminLogsTab userId={userId} />;
    case "chat-bans": return <ChatBansTab userId={userId} />;
    case "analyses": return <AnalysesTab userId={userId} />;
    case "heatmap": return <HeatmapTab userId={userId} />;
    default: return null;
  }
}

interface PointLogItem { id: number; type: string; amount: number; reason: string; balance: number | null; createdAt: string }
function PointsTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: PointLogItem[]; total: number; page: number; limit: number } | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (type) p.set("type", type);
    if (search) p.set("search", search);
    fetch(`/api/admin/users/${userId}/points?${p}`).then(r => r.json()).then(setData);
  }, [userId, page, type, search]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <div>
      <div className="flex gap-1 mb-2 items-center">
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="h-7 px-2 text-[11px] border border-gray-300 rounded">
          <option value="">전체</option>
          <option value="EARN">적립</option>
          <option value="DEDUCT">차감</option>
          <option value="EXCHANGE">교환</option>
        </select>
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-1 flex-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="사유 검색" className="h-7 flex-1 px-2 text-[11px] border border-gray-300 rounded" />
          <button type="submit" className="h-7 px-2 bg-gray-800 text-white text-[10px] font-bold rounded">검색</button>
        </form>
        <span className="text-[10px] text-gray-400">총 {data.total.toLocaleString()}건</span>
      </div>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold w-14">유형</th>
              <th className="px-2 py-1.5 text-right font-semibold w-20">금액</th>
              <th className="px-2 py-1.5 text-left font-semibold">사유</th>
              <th className="px-2 py-1.5 text-right font-semibold w-20">잔액</th>
              <th className="px-2 py-1.5 text-right font-semibold w-28">일시</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-gray-400">내역 없음</td></tr>
            ) : data.items.map(log => (
              <tr key={log.id} className="border-t border-gray-100">
                <td className="px-2 py-1.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.type === "EARN" ? "bg-blue-50 text-blue-600" : log.type === "DEDUCT" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                    {log.type === "EARN" ? "적립" : log.type === "DEDUCT" ? "차감" : "교환"}
                  </span>
                </td>
                <td className={`px-2 py-1.5 text-right font-mono font-bold ${log.type === "DEDUCT" ? "text-red-500" : log.type === "EARN" ? "text-blue-600" : "text-amber-600"}`}>
                  {log.type === "DEDUCT" ? "-" : "+"}{log.amount.toLocaleString()}
                </td>
                <td className="px-2 py-1.5 text-gray-700">{log.reason}</td>
                <td className="px-2 py-1.5 text-right font-mono text-gray-500">{log.balance !== null ? log.balance.toLocaleString() : "-"}</td>
                <td className="px-2 py-1.5 text-right text-gray-400 text-[10px]">{fmt(log.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

interface ChatItem { id: string; channel: string; bjNickname?: string; text: string; isPinned: boolean; createdAt: string }
function ChatsTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: ChatItem[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), limit: "50", type });
    fetch(`/api/admin/users/${userId}/chats?${p}`).then(r => r.json()).then(setData);
  }, [userId, page, type]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const totalPages = Math.max(1, Math.ceil(data.total / 50));
  return (
    <div>
      <div className="flex gap-1 mb-2 items-center">
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="h-7 px-2 text-[11px] border border-gray-300 rounded">
          <option value="all">전체</option>
          <option value="main">메인</option>
          <option value="bj">BJ</option>
        </select>
        <span className="text-[10px] text-gray-400">총 {data.total.toLocaleString()}건</span>
      </div>
      <div className="space-y-1 max-h-[600px] overflow-auto">
        {data.items.length === 0 ? <p className="text-center py-6 text-[12px] text-gray-400">내역 없음</p> :
          data.items.map(m => (
            <div key={m.id} className="border border-gray-100 rounded px-2 py-1.5 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${m.channel === "메인" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{m.channel}</span>
                <span className="text-[9px] text-gray-400">{fmt(m.createdAt)}</span>
              </div>
              <p className="text-[12px] text-gray-700 break-all">{m.text}</p>
            </div>
          ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

interface AttendanceItem { id: number; date: string; points: number; streak: number; createdAt: string }
function AttendanceTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: AttendanceItem[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  useEffect(() => {
    fetch(`/api/admin/users/${userId}/attendance?page=${page}&limit=60`).then(r => r.json()).then(setData);
  }, [userId, page]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const totalPages = Math.max(1, Math.ceil(data.total / 60));
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">총 {data.total}일 출석</p>
      <div className="grid grid-cols-3 gap-1 max-h-[500px] overflow-auto">
        {data.items.map(a => (
          <div key={a.id} className="border border-gray-100 rounded px-2 py-1 text-[11px]">
            <p className="font-bold text-gray-800">{a.date}</p>
            <p className="text-gray-500">+{a.points}P · {a.streak}일</p>
          </div>
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

interface ExchangeItem { id: number; productName: string; amount: number; status: string; memo: string | null; createdAt: string; updatedAt: string }
function ExchangesTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: ExchangeItem[]; total: number } | null>(null);
  useEffect(() => {
    fetch(`/api/admin/users/${userId}/exchanges?limit=100`).then(r => r.json()).then(setData);
  }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const STATUS: Record<string, { label: string; color: string }> = {
    PENDING: { label: "대기", color: "#d97706" },
    APPROVED: { label: "승인", color: "#16a34a" },
    REJECTED: { label: "거절", color: "#dc2626" },
    COMPLETED: { label: "완료", color: "#2563eb" },
    CANCELLED: { label: "취소", color: "#6b7280" },
  };
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">총 {data.total}건</p>
      <div className="space-y-1 max-h-[600px] overflow-auto">
        {data.items.length === 0 ? <p className="text-center py-6 text-[12px] text-gray-400">내역 없음</p> :
          data.items.map(x => {
            const s = STATUS[x.status] || { label: x.status, color: "#6b7280" };
            return (
              <div key={x.id} className="border border-gray-100 rounded px-2 py-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[12px] font-bold text-gray-800">{x.productName}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${s.color}15`, color: s.color }}>{s.label}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span>-{x.amount.toLocaleString()}P · {fmt(x.createdAt)}</span>
                  {x.memo && <span className="truncate max-w-[40%]">메모: {x.memo}</span>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

interface AccessItem { id: number; type: string; ip: string; userAgent: string; device: string; browser: string; os: string; path: string; createdAt: string }
function AccessTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: AccessItem[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    const p = new URLSearchParams({ page: String(page), limit: "30", type: filter });
    fetch(`/api/admin/users/${userId}/access-logs?${p}`).then(r => r.json()).then(setData);
  }, [userId, page, filter]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const totalPages = Math.max(1, Math.ceil(data.total / 30));
  return (
    <div>
      <div className="flex gap-1 mb-2 items-center">
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="h-7 px-2 text-[11px] border border-gray-300 rounded">
          <option value="all">전체</option>
          <option value="login">로그인</option>
          <option value="visit">접속</option>
        </select>
        <span className="text-[10px] text-gray-400">총 {data.total.toLocaleString()}회</span>
      </div>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-2 py-1.5 text-left font-semibold w-14">유형</th>
              <th className="px-2 py-1.5 text-left font-semibold w-32">IP</th>
              <th className="px-2 py-1.5 text-left font-semibold w-20">디바이스</th>
              <th className="px-2 py-1.5 text-left font-semibold">경로</th>
              <th className="px-2 py-1.5 text-right font-semibold w-28">일시</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">내역 없음</td></tr> :
              data.items.map(a => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-2 py-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${a.type === "login" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                      {a.type === "login" ? "로그인" : "접속"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-gray-700">{a.ip || "-"}</td>
                  <td className="px-2 py-1.5 text-gray-600">{a.device || a.browser || a.os || "-"}</td>
                  <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{a.path || "-"}</td>
                  <td className="px-2 py-1.5 text-right text-gray-400 text-[10px]">{fmt(a.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

interface DupItem { id: number; username: string; nickname: string; role: string; isActive: boolean; phoneVerified: boolean; createdAt: string; sharedIps: string[]; lastSharedAt: string | null }
function DuplicateIpTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ ips: { ip: string; totalAccesses: number }[]; otherUsers: DupItem[] } | null>(null);
  useEffect(() => {
    fetch(`/api/admin/users/${userId}/duplicate-ip`).then(r => r.json()).then(setData);
  }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-[11px] font-bold text-gray-500 mb-1">사용 IP ({data.ips.length})</h4>
        <div className="border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-50 text-gray-600">
              <tr><th className="px-2 py-1.5 text-left font-semibold">IP</th><th className="px-2 py-1.5 text-right font-semibold">총 접속</th></tr>
            </thead>
            <tbody>
              {data.ips.map(i => <tr key={i.ip} className="border-t border-gray-100"><td className="px-2 py-1.5 font-mono">{i.ip}</td><td className="px-2 py-1.5 text-right">{i.totalAccesses.toLocaleString()}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h4 className="text-[11px] font-bold text-gray-500 mb-1">같은 IP 사용한 다른 회원 ({data.otherUsers.length})</h4>
        {data.otherUsers.length === 0 ? <p className="text-[11px] text-gray-400">없음</p> :
          <div className="border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">닉네임</th>
                  <th className="px-2 py-1.5 text-center font-semibold">상태</th>
                  <th className="px-2 py-1.5 text-right font-semibold">공유 IP</th>
                  <th className="px-2 py-1.5 text-right font-semibold">최근 공유</th>
                </tr>
              </thead>
              <tbody>
                {data.otherUsers.map(u => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-2 py-1.5">
                      <Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline font-bold">{u.nickname}</Link>
                      <span className="text-[9px] text-gray-400 ml-1">({u.username})</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`text-[9px] font-bold ${u.isActive ? "text-green-600" : "text-red-500"}`}>{u.isActive ? "활성" : "비활성"}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-600">{u.sharedIps.length}개</td>
                    <td className="px-2 py-1.5 text-right text-gray-400 text-[10px]">{fmtRel(u.lastSharedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </div>
    </div>
  );
}

interface PhoneLogItem { id: number; phone: string; success: boolean; type: string; ip: string; createdAt: string }
function PhoneLogsTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: PhoneLogItem[]; total: number } | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${userId}/phone-logs?limit=100`).then(r => r.json()).then(setData); }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">총 {data.total}회</p>
      <div className="border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[11px]">
          <thead className="bg-gray-50 text-gray-600">
            <tr><th className="px-2 py-1.5 text-left font-semibold">유형</th><th className="px-2 py-1.5 text-left font-semibold">전화</th><th className="px-2 py-1.5 text-center font-semibold">결과</th><th className="px-2 py-1.5 text-left font-semibold">IP</th><th className="px-2 py-1.5 text-right font-semibold">일시</th></tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-gray-400">내역 없음</td></tr> :
              data.items.map(l => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="px-2 py-1.5">{l.type === "send" ? "발송" : "검증"}</td>
                  <td className="px-2 py-1.5 font-mono">{l.phone}</td>
                  <td className="px-2 py-1.5 text-center"><span className={`text-[9px] font-bold ${l.success ? "text-green-600" : "text-red-500"}`}>{l.success ? "성공" : "실패"}</span></td>
                  <td className="px-2 py-1.5 font-mono text-gray-500">{l.ip || "-"}</td>
                  <td className="px-2 py-1.5 text-right text-gray-400 text-[10px]">{fmt(l.createdAt)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AdminLogItem { id: number; userId: number; nickname: string; action: string; detail: string; ip: string; createdAt: string }
function AdminLogsTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: AdminLogItem[]; total: number } | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${userId}/admin-logs?limit=100`).then(r => r.json()).then(setData); }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">이 회원에게 가해진 관리자 액션 — {data.total}건</p>
      <div className="space-y-1 max-h-[600px] overflow-auto">
        {data.items.length === 0 ? <p className="text-center py-6 text-[11px] text-gray-400">내역 없음</p> :
          data.items.map(l => (
            <div key={l.id} className="border border-gray-100 rounded px-2 py-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-gray-800">{l.action}</span>
                <span className="text-[9px] text-gray-400">{fmt(l.createdAt)}</span>
              </div>
              <p className="text-[10px] text-gray-500">관리자: {l.nickname || `#${l.userId}`} · IP {l.ip || "-"}</p>
              {l.detail && <pre className="mt-1 text-[10px] bg-gray-50 rounded px-1.5 py-1 text-gray-600 overflow-x-auto whitespace-pre-wrap">{l.detail}</pre>}
            </div>
          ))}
      </div>
    </div>
  );
}

function ChatBansTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: { id: number; bjNickname: string; createdAt: string }[]; total: number } | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${userId}/chat-bans`).then(r => r.json()).then(setData); }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">차단 이력 {data.total}건</p>
      {data.items.length === 0 ? <p className="text-[11px] text-gray-400">없음</p> :
        <div className="space-y-1">
          {data.items.map(b => (
            <div key={b.id} className="border border-gray-100 rounded px-2 py-1.5 flex items-center justify-between">
              <span className="text-[12px] font-bold">BJ: {b.bjNickname}</span>
              <span className="text-[10px] text-gray-400">{fmt(b.createdAt)}</span>
            </div>
          ))}
        </div>}
    </div>
  );
}

interface AnalysisItem { id: number; sport: string; league: string; homeTeam: string; awayTeam: string; title: string; result: string; isPremium: boolean; viewCount: number; likeCount: number; matchTime: string; createdAt: string }
function AnalysesTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ items: AnalysisItem[]; total: number } | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${userId}/analyses?limit=50`).then(r => r.json()).then(setData); }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">총 {data.total}건</p>
      <div className="space-y-1 max-h-[600px] overflow-auto">
        {data.items.length === 0 ? <p className="text-center py-6 text-[11px] text-gray-400">내역 없음</p> :
          data.items.map(p => (
            <div key={p.id} className="border border-gray-100 rounded px-2 py-1.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[12px] font-bold text-gray-800 truncate flex-1">{p.title}</span>
                <span className="text-[9px] font-bold text-gray-400 ml-2">{p.result}</span>
              </div>
              <p className="text-[10px] text-gray-500">{p.league} · {p.homeTeam} vs {p.awayTeam} · 👁 {p.viewCount} · ♥ {p.likeCount} · {fmt(p.createdAt)}</p>
            </div>
          ))}
      </div>
    </div>
  );
}

function HeatmapTab({ userId }: { userId: number }) {
  const [data, setData] = useState<{ days: { date: string; chats: number; visits: number; attended: boolean; total: number }[] } | null>(null);
  useEffect(() => { fetch(`/api/admin/users/${userId}/activity-heatmap`).then(r => r.json()).then(setData); }, [userId]);
  if (!data) return <p className="text-sm text-gray-400">로딩...</p>;
  const max = Math.max(1, ...data.days.map(d => d.total));
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-2">최근 30일 활동량</p>
      <div className="grid grid-cols-10 gap-1">
        {data.days.map(d => {
          const intensity = d.total / max;
          const bg = d.total === 0 ? "#f3f4f6" : `rgba(34,197,94,${0.2 + intensity * 0.8})`;
          return (
            <div key={d.date} className="rounded p-1 text-center" style={{ background: bg, minHeight: 50 }} title={`${d.date} 채팅 ${d.chats} 접속 ${d.visits} ${d.attended ? "출석" : ""}`}>
              <p className="text-[9px] font-bold text-gray-700">{d.date.slice(5)}</p>
              <p className="text-[10px] font-black text-gray-900">{d.total}</p>
              {d.attended && <p className="text-[9px]">📅</p>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 mt-2 text-[9px] text-gray-400">
        <span>📅 출석 · 진하기 = 활동량</span>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40">‹</button>
      <span className="px-2 py-1 text-[10px] text-gray-600">{page} / {totalPages}</span>
      <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="px-2 py-1 text-[10px] bg-white border border-gray-300 rounded disabled:opacity-40">›</button>
    </div>
  );
}

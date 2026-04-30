"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

const ROLE_OPTIONS = [
  { value: "USER", label: "일반" },
  { value: "PICKSTER", label: "픽스터" },
  { value: "BJ", label: "BJ" },
  { value: "ADMIN", label: "관리자" },
  { value: "SUPERADMIN", label: "최고관리자" },
];

interface PointLog { id: number; type: string; amount: number; reason: string; createdAt: string }
interface Exchange { id: number; productName: string; amount: number; status: string; createdAt: string }

interface UserDetail {
  id: number; username: string; nickname: string; role: string;
  points: number; exp: number; isActive: boolean;
  name: string | null; phone: string | null; phoneVerified: boolean; email: string | null; referredBy: string | null;
  createdAt: string; updatedAt: string;
  pointLogs: PointLog[];
  pointExchanges: Exchange[];
  _count: { chatMessages: number; attendances: number; pointExchanges: number };
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 편집 상태
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pointAmount, setPointAmount] = useState("");
  const [pointReason, setPointReason] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expReason, setExpReason] = useState("");
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then(r => r.json()).then(d => {
      if (d.error) { router.push("/admin/users"); return; }
      setUser(d);
      setRole(d.role);
      setIsActive(d.isActive);
      setNickname(d.nickname);
    });
  }, [id, router]);

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
      // 새로고침
      const fresh = await fetch(`/api/admin/users/${id}`).then(r => r.json());
      setUser(fresh);
      setRole(fresh.role);
      setIsActive(fresh.isActive);
      setNickname(fresh.nickname);
    } else {
      setMsg(result.error || "오류가 발생했습니다.");
    }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleRoleSave = () => save({ role });
  const handleToggleActive = () => save({ isActive: !isActive });
  const handleResetPassword = () => {
    if (!confirm("비밀번호를 '1234'로 초기화합니다. 계속하시겠습니까?")) return;
    save({ resetPassword: true });
  };
  const handlePointAdjust = () => {
    const amount = parseInt(pointAmount);
    if (!amount || isNaN(amount)) return;
    save({ pointAdjust: { amount, reason: pointReason || "관리자 수동 조정" } });
    setPointAmount("");
    setPointReason("");
  };
  const handleExpAdjust = () => {
    const amount = parseInt(expAmount);
    if (!amount || isNaN(amount)) return;
    save({ expAdjust: { amount, reason: expReason || "관리자 수동 조정" } });
    setExpAmount("");
    setExpReason("");
  };
  const handleNicknameSave = () => {
    if (!nickname.trim() || nickname === user?.nickname) return;
    save({ nickname: nickname.trim() });
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR");

  if (!user) return <p className="text-sm text-gray-400">로딩중...</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-4">
        <Link href="/admin/users" className="text-[12px] text-gray-500 hover:text-gray-700">회원 관리</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-bold text-gray-800">{user.nickname}</span>
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      {/* 기본 정보 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">기본 정보</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[13px]">
          <div><span className="text-gray-500">ID</span><p className="font-semibold text-gray-800">{user.id}</p></div>
          <div><span className="text-gray-500">아이디</span><p className="font-semibold text-gray-800">{user.username}</p></div>
          <div>
            <span className="text-gray-500">닉네임</span>
            <div className="flex gap-1 mt-0.5">
              <input value={nickname} onChange={e => setNickname(e.target.value)} className="h-7 w-28 px-2 text-[13px] font-semibold border border-gray-300 rounded" />
              <button onClick={handleNicknameSave} disabled={saving || nickname === user.nickname} className="h-7 px-2 bg-gray-800 text-white text-[11px] font-bold rounded disabled:opacity-40">변경</button>
            </div>
          </div>
          <div><span className="text-gray-500">이름</span><p className="font-semibold text-gray-800">{user.name || "-"}</p></div>
          <div>
            <span className="text-gray-500">전화번호</span>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-gray-800">{user.phone || "-"}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user.phoneVerified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                {user.phoneVerified ? "인증완료" : "미인증"}
              </span>
            </div>
          </div>
          <div><span className="text-gray-500">이메일</span><p className="font-semibold text-gray-800">{user.email || "-"}</p></div>
          <div><span className="text-gray-500">추천인</span><p className="font-semibold text-gray-800">{user.referredBy || "-"}</p></div>
          <div><span className="text-gray-500">가입일</span><p className="font-semibold text-gray-800">{formatDate(user.createdAt)}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100 text-[13px]">
          <div><span className="text-gray-500">채팅</span><p className="font-bold text-gray-800">{user._count.chatMessages}건</p></div>
          <div><span className="text-gray-500">출석</span><p className="font-bold text-gray-800">{user._count.attendances}일</p></div>
          <div><span className="text-gray-500">교환신청</span><p className="font-bold text-gray-800">{user._count.pointExchanges}건</p></div>
        </div>
      </div>

      {/* 등급 / 상태 / 비밀번호 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">등급 및 상태</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">회원 등급</label>
            <div className="flex gap-1">
              <select value={role} onChange={e => setRole(e.target.value)} className="h-8 px-2 text-[13px] border border-gray-300 rounded">
                {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button onClick={handleRoleSave} disabled={saving || role === user.role} className="h-8 px-3 bg-gray-800 text-white text-[12px] font-bold rounded disabled:opacity-40">변경</button>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">계정 상태</label>
            <button onClick={handleToggleActive} disabled={saving} className={`h-8 px-3 text-[12px] font-bold rounded text-white ${isActive ? "bg-red-500" : "bg-green-600"}`}>
              {isActive ? "비활성화" : "활성화"}
            </button>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">비밀번호</label>
            <button onClick={handleResetPassword} disabled={saving} className="h-8 px-3 bg-gray-600 text-white text-[12px] font-bold rounded">
              1234로 초기화
            </button>
          </div>
        </div>
      </div>

      {/* 포인트 / 경험치 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">포인트 / 경험치</h2>
        <div className="flex gap-6 mb-3 text-[13px]">
          <div><span className="text-gray-500">현재 포인트</span><p className="text-xl font-bold text-blue-600">{user.points.toLocaleString()} P</p></div>
          <div><span className="text-gray-500">현재 경험치</span><p className="text-xl font-bold text-purple-600">{user.exp.toLocaleString()} EXP</p></div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">포인트 조정 (음수 가능)</label>
            <input type="number" value={pointAmount} onChange={e => setPointAmount(e.target.value)} placeholder="예: 5000 또는 -1000" className="h-8 w-36 px-2 text-[13px] border border-gray-300 rounded" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">사유</label>
            <input value={pointReason} onChange={e => setPointReason(e.target.value)} placeholder="사유 입력" className="h-8 w-48 px-2 text-[13px] border border-gray-300 rounded" />
          </div>
          <button onClick={handlePointAdjust} disabled={saving || !pointAmount} className="h-8 px-3 bg-blue-600 text-white text-[12px] font-bold rounded disabled:opacity-40">적용</button>
        </div>
        <div className="flex flex-wrap items-end gap-2 mt-3 pt-3 border-t border-gray-100">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">경험치 조정 (음수 가능)</label>
            <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="예: 500 또는 -100" className="h-8 w-36 px-2 text-[13px] border border-gray-300 rounded" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">사유</label>
            <input value={expReason} onChange={e => setExpReason(e.target.value)} placeholder="사유 입력" className="h-8 w-48 px-2 text-[13px] border border-gray-300 rounded" />
          </div>
          <button onClick={handleExpAdjust} disabled={saving || !expAmount} className="h-8 px-3 bg-purple-600 text-white text-[12px] font-bold rounded disabled:opacity-40">적용</button>
        </div>
      </div>

      {/* 최근 포인트 내역 */}
      {user.pointLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b border-gray-100">최근 포인트 내역 (20건)</h2>
          <table className="w-full text-[12px]">
            <thead><tr className="text-gray-500 border-b"><th className="pb-1 text-left">유형</th><th className="pb-1 text-right">금액</th><th className="pb-1 text-left">사유</th><th className="pb-1 text-right">일시</th></tr></thead>
            <tbody>
              {user.pointLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-50">
                  <td className="py-1.5"><span className={`font-bold ${log.type === "EARN" ? "text-blue-600" : log.type === "DEDUCT" ? "text-red-500" : "text-amber-600"}`}>{log.type}</span></td>
                  <td className="py-1.5 text-right font-mono">{log.type === "DEDUCT" ? "-" : "+"}{log.amount.toLocaleString()}</td>
                  <td className="py-1.5 text-gray-600">{log.reason}</td>
                  <td className="py-1.5 text-right text-gray-400">{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

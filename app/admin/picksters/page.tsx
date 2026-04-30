"use client";

import { useState, useEffect } from "react";
import AvatarUpload from "@/components/ui/AvatarUpload";

interface PicksterItem {
  id: number;
  userId: number;
  nickname: string;
  role: string;
  avatar: string;
  sport: string;
  intro: string;
  tier: string;
  monthlyFee: number;
  isApproved: boolean;
  isActive: boolean;
  createdAt: string;
}

const TIERS = ["브론즈", "실버", "골드", "플래티넘", "다이아몬드"];

export default function AdminPickstersPage() {
  const [picksters, setPicksters] = useState<PicksterItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    fetch("/api/admin/picksters")
      .then(r => r.json())
      .then(data => setPicksters(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (id: number, data: Record<string, unknown>) => {
    await fetch("/api/admin/picksters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    fetchData();
  };

  const handleReject = async (id: number, nickname: string) => {
    if (!confirm(`"${nickname}" 픽스터 신청을 거절하시겠습니까?\n프로필이 완전히 삭제됩니다.`)) return;
    await fetch(`/api/admin/picksters?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleDelete = async (id: number, nickname: string) => {
    if (!confirm(`"${nickname}" 픽스터를 삭제하시겠습니까?\n프로필 + 픽스터 권한(role)이 함께 제거됩니다.`)) return;
    await fetch(`/api/admin/picksters?id=${id}&demote=1`, { method: "DELETE" });
    fetchData();
  };

  const pending = picksters.filter(p => !p.isApproved);
  const approved = picksters.filter(p => p.isApproved);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>픽스터 관리</h1>

      {/* 대기중 신청 */}
      <div>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          대기중 신청
          {pending.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#dc2626" }}>{pending.length}</span>
          )}
        </h2>
        {loading ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>불러오는 중...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>대기중인 신청이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="p-4 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={`/admin/users/${p.userId}`} className="text-sm font-bold text-blue-600 hover:underline">{p.nickname}</a>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#fef3c7", color: "#92400e" }}>대기</span>
                    </div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>종목: {p.sport} · 월 {p.monthlyFee > 0 ? `${p.monthlyFee.toLocaleString()}원` : "무료"}</p>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{p.intro}</p>
                    <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>신청일: {new Date(p.createdAt).toLocaleDateString("ko-KR")}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAction(p.id, { isApproved: true })}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: "#16a34a" }}
                    >승인</button>
                    <button
                      onClick={() => handleReject(p.id, p.nickname)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: "#dc2626" }}
                    >거절</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 승인된 픽스터 */}
      <div>
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>승인된 픽스터 ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>승인된 픽스터가 없습니다.</p>
        ) : (
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>아바타</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>닉네임</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>종목</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>티어</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>상태</th>
                  <th className="px-3 py-2 text-right text-xs font-bold" style={{ color: "var(--text-secondary)" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((p, idx) => (
                  <tr key={p.id} style={{ background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                    <td className="px-3 py-2">
                      <AvatarUpload
                        currentAvatar={p.avatar}
                        profileId={p.id}
                        onUploaded={() => fetchData()}
                      />
                    </td>
                    <td className="px-3 py-2 font-bold"><a href={`/admin/users/${p.userId}`} className="text-blue-600 hover:underline">{p.nickname}</a></td>
                    <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{p.sport}</td>
                    <td className="px-3 py-2">
                      <select
                        value={p.tier}
                        onChange={e => handleAction(p.id, { tier: e.target.value })}
                        className="text-xs rounded px-1 py-0.5"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      >
                        {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.isActive ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"}`}>
                        {p.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleAction(p.id, { isActive: !p.isActive })}
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                        >
                          {p.isActive ? "비활성화" : "활성화"}
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nickname)}
                          className="text-[10px] font-bold px-2 py-1 rounded text-white"
                          style={{ background: "#dc2626" }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

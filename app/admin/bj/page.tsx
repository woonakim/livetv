"use client";

import { useState, useEffect, useRef } from "react";

interface BjItem {
  id: number; userId: number; nickname: string; username: string; role: string;
  streamKey: string; title: string; avatar: string; avatarType: string;
  isLive: boolean; isApproved: boolean; isActive: boolean;
  viewCount: number; createdAt: string;
  fakeViewersEnabled?: boolean; fakeViewersMin?: number; fakeViewersMax?: number; fakeViewersRampSec?: number;
}

const EMOJI_LIST = ["👑", "🎬", "🎤", "🔥", "⭐", "💎", "🏆", "🎯", "🦁", "🐯", "🦊", "🐻", "🎮", "⚽", "🏀", "⚾", "🎸", "🎵", "💜", "💙"];

function BjAvatar({ bj, onUploaded }: { bj: BjItem; onUploaded: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("profileId", String(bj.id));
    const res = await fetch("/api/bj/avatar", { method: "POST", body: fd });
    if (res.ok) onUploaded();
    else alert("업로드 실패");
    setUploading(false);
    setOpen(false);
  };

  const selectEmoji = async (emoji: string) => {
    await fetch("/api/admin/bj", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bj.id, avatar: emoji, avatarType: "emoji" }),
    });
    onUploaded();
    setOpen(false);
  };

  const src = bj.avatarType === "image" && bj.avatar ? `${bj.avatar}?v=${Date.now()}` : null;

  return (
    <div className="relative">
      <button ref={btnRef} onClick={() => {
          if (!open && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPopupPos({ top: rect.bottom + 4, left: rect.left });
          }
          setOpen(!open);
        }}
        className="relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 group cursor-pointer"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full h-full object-cover" />
        ) : bj.avatar ? (
          <span className="text-lg">{bj.avatar}</span>
        ) : (
          <span className="text-sm font-black" style={{ color: "var(--text-secondary)" }}>{bj.nickname[0]}</span>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">변경</span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
          </div>
        )}
      </button>
      {/* 팝업 */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed z-50 w-[220px] rounded-lg p-3 shadow-xl" style={{ top: popupPos.top, left: popupPos.left, background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[11px] font-bold mb-2" style={{ color: "var(--text-secondary)" }}>이모지 선택</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {EMOJI_LIST.map(e => (
                <button key={e} onClick={() => selectEmoji(e)}
                  className="w-8 h-8 rounded flex items-center justify-center text-base hover:scale-110 transition-transform"
                  style={{ background: bj.avatar === e && bj.avatarType === "emoji" ? "var(--brand)" : "var(--bg)", border: "1px solid var(--border)" }}>
                  {e}
                </button>
              ))}
            </div>
            <button onClick={() => { fileRef.current?.click(); }}
              className="w-full py-1.5 rounded text-[11px] font-bold"
              style={{ background: "var(--bg)", border: "1px dashed var(--border)", color: "var(--text-secondary)" }}>
              이미지 업로드
            </button>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
    </div>
  );
}

export default function AdminBjPage() {
  const [bjs, setBjs] = useState<BjItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string>("");
  const [fakeModal, setFakeModal] = useState<BjItem | null>(null);

  const fetchData = () => {
    fetch("/api/admin/bj").then(r => r.json()).then(d => setBjs(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchData();
    fetch("/api/auth/me").then(r => r.json()).then(d => setMyRole(d?.user?.role || "")).catch(() => {});
  }, []);

  const handleAction = async (id: number, data: Record<string, unknown>) => {
    await fetch("/api/admin/bj", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...data }) });
    fetchData();
  };

  const handleReject = async (id: number, nickname: string) => {
    if (!confirm(`"${nickname}" BJ 신청을 거절하시겠습니까?\n프로필이 완전히 삭제됩니다.`)) return;
    await fetch(`/api/admin/bj?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const handleDelete = async (id: number, nickname: string) => {
    if (!confirm(`"${nickname}" BJ를 삭제하시겠습니까?\n프로필 + BJ 권한(role)이 함께 제거됩니다.`)) return;
    await fetch(`/api/admin/bj?id=${id}&demote=1`, { method: "DELETE" });
    fetchData();
  };

  const pending = bjs.filter(b => !b.isApproved);
  const approved = bjs.filter(b => b.isApproved);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>BJ 관리</h1>

      {/* 대기중 */}
      <div>
        <h2 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          대기중 신청
          {pending.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#dc2626" }}>{pending.length}</span>}
        </h2>
        {loading ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>불러오는 중...</p>
        ) : pending.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>대기중인 신청이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {pending.map(b => (
              <div key={b.id} className="p-4 rounded-lg flex items-center justify-between" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <div>
                  <a href={`/admin/users/${b.userId}`} className="text-sm font-bold text-blue-600 hover:underline">{b.nickname}</a>
                  <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>{b.username}</span>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>신청일: {new Date(b.createdAt).toLocaleDateString("ko-KR")}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleAction(b.id, { isApproved: true })} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "#16a34a" }}>승인</button>
                  <button onClick={() => handleReject(b.id, b.nickname)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "#dc2626" }}>거절</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 가짜 시청자 설정 모달 */}
      {fakeModal && (
        <FakeViewerModal
          bj={fakeModal}
          onClose={() => setFakeModal(null)}
          onSaved={() => { fetchData(); setFakeModal(null); }}
        />
      )}

      {/* 승인된 BJ */}
      <div>
        <h2 className="text-sm font-bold mb-2" style={{ color: "var(--text-primary)" }}>승인된 BJ ({approved.length})</h2>
        {approved.length === 0 ? (
          <p className="text-sm py-4" style={{ color: "var(--text-secondary)" }}>승인된 BJ가 없습니다.</p>
        ) : (
          <div className="rounded-lg" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bg)" }}>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>프로필</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>닉네임</th>
                  <th className="px-3 py-2 text-left text-xs font-bold" style={{ color: "var(--text-secondary)" }}>스트림키</th>
                  <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>상태</th>
                  <th className="px-3 py-2 text-center text-xs font-bold" style={{ color: "var(--text-secondary)" }}>방송</th>
                  <th className="px-3 py-2 text-right text-xs font-bold" style={{ color: "var(--text-secondary)" }}>누적시청</th>
                  <th className="px-3 py-2 text-right text-xs font-bold" style={{ color: "var(--text-secondary)" }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {approved.map((b, idx) => (
                  <tr key={b.id} style={{ background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                    <td className="px-3 py-2">
                      <BjAvatar bj={b} onUploaded={fetchData} />
                    </td>
                    <td className="px-3 py-2 font-bold"><a href={`/admin/users/${b.userId}`} className="text-blue-600 hover:underline">{b.nickname}</a></td>
                    <td className="px-3 py-2 font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>{b.streamKey.slice(0, 16)}...</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.isActive ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"}`}>
                        {b.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {b.isLive ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-red-500">● LIVE</span> : <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>OFF</span>}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: "var(--text-primary)" }}>{b.viewCount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleAction(b.id, { isActive: !b.isActive })} className="text-[10px] font-bold px-2 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                          {b.isActive ? "비활성화" : "활성화"}
                        </button>
                        <button onClick={() => { if (confirm("스트림키를 재발급하시겠습니까?")) handleAction(b.id, { regenerateKey: true }); }} className="text-[10px] font-bold px-2 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                          키 재발급
                        </button>
                        {myRole === "SUPERADMIN" && (
                          <button onClick={() => setFakeModal(b)} className="text-[10px] font-bold px-2 py-1 rounded text-white" style={{ background: b.fakeViewersEnabled ? "#7c3aed" : "#6b7280" }}>
                            가짜시청{b.fakeViewersEnabled ? " ON" : ""}
                          </button>
                        )}
                        <button onClick={() => handleDelete(b.id, b.nickname)} className="text-[10px] font-bold px-2 py-1 rounded text-white" style={{ background: "#dc2626" }}>
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

function FakeViewerModal({ bj, onClose, onSaved }: { bj: BjItem; onClose: () => void; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(!!bj.fakeViewersEnabled);
  const [min, setMin] = useState(bj.fakeViewersMin ?? 0);
  const [max, setMax] = useState(bj.fakeViewersMax ?? 0);
  const [rampMin, setRampMin] = useState(Math.round((bj.fakeViewersRampSec ?? 600) / 60));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    setErr("");
    if (min < 0 || max < 0) { setErr("0 이상 입력하세요."); return; }
    if (max < min) { setErr("최대값이 최소값보다 작습니다."); return; }
    if (rampMin < 1) { setErr("ramp 분은 1 이상."); return; }
    setSaving(true);
    const res = await fetch("/api/admin/bj", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: bj.id,
        fakeViewersEnabled: enabled,
        fakeViewersMin: min,
        fakeViewersMax: max,
        fakeViewersRampSec: rampMin * 60,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const j = await res.json().catch(() => ({})); setErr(j.error || "저장 실패"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-[400px] max-w-[90vw] rounded-xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-black mb-1" style={{ color: "var(--text-primary)" }}>👥 가짜 시청자 설정 — {bj.nickname}</h3>
        <p className="text-[11px] mb-4" style={{ color: "var(--text-secondary)" }}>
          실제 시청자 + 가짜 boost로 표시값 부풀리기. 방송 시작 후 ramp 시간 동안 0 → max로 천천히 증가, 이후 min~max 사이 random walk.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>활성화</span>
            <button onClick={() => setEnabled(!enabled)} disabled={saving}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}>
              <span className="absolute rounded-full transition-all" style={{ top: 2, left: enabled ? 22 : 2, width: 20, height: 20, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)" }} />
            </button>
            <span className="text-xs font-bold" style={{ color: enabled ? "var(--brand)" : "var(--text-secondary)" }}>{enabled ? "ON" : "OFF"}</span>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>가짜 boost 범위 (min ~ max)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={min} onChange={e => setMin(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>~</span>
              <input type="number" min={0} value={max} onChange={e => setMax(parseInt(e.target.value) || 0)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>Ramp-up 시간 (방송 시작 후 N분간 천천히 증가)</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} value={rampMin} onChange={e => setRampMin(parseInt(e.target.value) || 1)} className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>분</span>
            </div>
          </div>
        </div>
        {err && <p className="text-[11px] font-bold mt-3" style={{ color: "#ef4444" }}>{err}</p>}
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} disabled={saving} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>취소</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "var(--brand)" }}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

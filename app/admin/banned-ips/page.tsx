"use client";

import { useEffect, useState, useCallback } from "react";

interface BannedIp { id: number; ip: string; reason: string; bannedBy: string; createdAt: string; }

export default function AdminBannedIpsPage() {
  const [ips, setIps] = useState<BannedIp[]>([]);
  const [newIp, setNewIp] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => { fetch("/api/admin/banned-ips").then(r => r.json()).then(d => setIps(Array.isArray(d) ? d : [])); }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const handleBan = async () => {
    if (!newIp.trim()) return;
    await fetch("/api/admin/banned-ips", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip: newIp.trim(), reason }),
    });
    setNewIp(""); setReason("");
    flash("IP가 차단되었습니다.");
    load();
  };

  const handleUnban = async (ip: string) => {
    if (!confirm(`${ip} 차단을 해제하시겠습니까?`)) return;
    await fetch("/api/admin/banned-ips", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip }),
    });
    flash("차단이 해제되었습니다.");
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>IP 차단 관리</h1>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>IP 차단 등록</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>IP 주소</label>
            <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="123.456.789.0" className="h-8 w-44 px-2 rounded text-[13px] font-mono" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>사유</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="차단 사유" className="h-8 w-48 px-2 rounded text-[13px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <button onClick={handleBan} className="h-8 px-4 rounded text-[12px] font-bold text-white" style={{ background: "#dc2626" }}>차단</button>
        </div>
      </div>

      <div className="rounded-lg" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>IP</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>사유</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>차단자</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>일시</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {ips.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: "var(--text-secondary)" }}>차단된 IP가 없습니다.</td></tr>}
            {ips.map(ip => (
              <tr key={ip.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td className="px-3 py-2 font-mono font-bold" style={{ color: "var(--text-primary)" }}>{ip.ip}</td>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{ip.reason || "-"}</td>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{ip.bannedBy}</td>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{new Date(ip.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => handleUnban(ip.ip)} className="text-[11px] font-bold text-red-500 hover:underline">해제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

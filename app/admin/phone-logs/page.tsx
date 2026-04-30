"use client";

import { useEffect, useState, useCallback } from "react";

interface LogItem {
  id: number; userId: number; nickname: string; phone: string;
  success: boolean; type: string; ip: string; createdAt: string;
}

export default function AdminPhoneLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [type, setType] = useState("");
  const [successOnly, setSuccessOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (successOnly) params.set("successOnly", "1");
    fetch(`/api/admin/phone-logs?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [page, search, type, successOnly]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(searchInput); };
  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const totalPages = Math.ceil(total / 30);

  return (
    <div>
      <h1 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        최근 인증 내역 <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>{total}건</span>
      </h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <form onSubmit={handleSearch} className="flex gap-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="닉네임, 번호, IP 검색"
            className="h-8 px-3 rounded text-[13px] w-52" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          <button type="submit" className="h-8 px-3 rounded text-[12px] font-bold text-white" style={{ background: "var(--brand)" }}>검색</button>
        </form>
        <select value={type} onChange={e => { setType(e.target.value); setPage(1); }}
          className="h-8 px-2 rounded text-[13px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="">전체 유형</option>
          <option value="send">발송</option>
          <option value="verify">인증</option>
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-bold px-3 py-1.5 rounded" style={{ color: "var(--text-primary)", border: "1px solid var(--border)" }}>
          <input type="checkbox" checked={successOnly} onChange={e => { setSuccessOnly(e.target.checked); setPage(1); }} />
          성공만 보기
        </label>
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>불러오는 중...</p>
      ) : logs.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-secondary)" }}>기록이 없습니다.</p>
      ) : (
        <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--bg)" }}>
                <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>시간</th>
                <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>닉네임</th>
                <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>전화번호</th>
                <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>유형</th>
                <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>결과</th>
                <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(l.createdAt)}</td>
                  <td className="px-3 py-2 font-bold">
                    <a href={`/admin/users/${l.userId}`} className="text-blue-600 hover:underline">{l.nickname || `#${l.userId}`}</a>
                  </td>
                  <td className="px-3 py-2 font-mono" style={{ color: "var(--text-primary)" }}>{l.phone}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: l.type === "send" ? "#3b82f6" : "#8b5cf6" }}>
                      {l.type === "send" ? "발송" : "인증"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {l.success
                      ? <span className="text-[10px] font-bold text-green-600"><i className="fas fa-check-circle mr-1" />성공</span>
                      : <span className="text-[10px] font-bold text-red-500"><i className="fas fa-times-circle mr-1" />실패</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>{l.ip || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-[12px] font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page <= 1 ? 0.3 : 1 }}>이전</button>
          <span className="px-3 py-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded text-[12px] font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page >= totalPages ? 0.3 : 1 }}>다음</button>
        </div>
      )}
    </div>
  );
}

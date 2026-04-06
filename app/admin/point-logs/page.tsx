"use client";

import { useEffect, useState, useCallback } from "react";

interface PointLog {
  id: number; userId: number; type: string; amount: number; reason: string; createdAt: string;
  user: { id: number; nickname: string; username: string };
}

const TYPE_LABEL: Record<string, string> = { EARN: "적립", DEDUCT: "차감", EXCHANGE: "교환" };
const TYPE_COLOR: Record<string, string> = { EARN: "#3b82f6", DEDUCT: "#ef4444", EXCHANGE: "#f59e0b" };

export default function AdminPointLogsPage() {
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    fetch(`/api/admin/point-logs?${params}`).then(r => r.json()).then(d => {
      setLogs(d.logs || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    });
  }, [page, typeFilter, search]);
  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-800 mb-4">포인트 내역 <span className="text-sm font-normal text-gray-400 ml-1">총 {total}건</span></h1>

      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={e => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="닉네임, 아이디 검색" className="h-8 px-3 text-[13px] border border-gray-300 rounded w-48 focus:outline-none" />
          <button type="submit" className="h-8 px-3 bg-gray-800 text-white text-[12px] font-bold rounded">검색</button>
        </form>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="h-8 px-2 text-[13px] border border-gray-300 rounded">
          <option value="">전체 유형</option>
          <option value="EARN">적립</option>
          <option value="DEDUCT">차감</option>
          <option value="EXCHANGE">교환</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">회원</th>
              <th className="px-3 py-2.5 text-center font-semibold">유형</th>
              <th className="px-3 py-2.5 text-right font-semibold">금액</th>
              <th className="px-3 py-2.5 text-left font-semibold">사유</th>
              <th className="px-3 py-2.5 text-center font-semibold">일시</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{log.id}</td>
                <td className="px-3 py-2 font-semibold"><a href={`/admin/users/${log.user.id}`} className="text-blue-600 hover:underline">{log.user.nickname}</a> <span className="text-gray-400 font-normal">({log.user.username})</span></td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: `${TYPE_COLOR[log.type]}15`, color: TYPE_COLOR[log.type] }}>
                    {TYPE_LABEL[log.type]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: log.type === "EARN" ? "#3b82f6" : "#ef4444" }}>
                  {log.type === "DEDUCT" || log.type === "EXCHANGE" ? "-" : "+"}{log.amount.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{log.reason}</td>
                <td className="px-3 py-2 text-center text-gray-500 text-[12px]">{formatDate(log.createdAt)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-gray-400">내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-[12px] bg-white border border-gray-300 rounded disabled:opacity-40">이전</button>
          <span className="px-3 py-1.5 text-[12px] text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-[12px] bg-white border border-gray-300 rounded disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}

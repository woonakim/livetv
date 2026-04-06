"use client";

import { useState, useEffect } from "react";

interface LogItem {
  id: number;
  userId: number | null;
  nickname: string | null;
  username: string | null;
  type: string;
  ip: string;
  fingerprint: string;
  device: string;
  browser: string;
  os: string;
  referer: string;
  path: string;
  createdAt: string;
}

interface Stats {
  todayVisits: number;
  todayLogins: number;
  todayUniqueIps: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function AdminAccessLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [stats, setStats] = useState<Stats>({ todayVisits: 0, todayLogins: 0, todayUniqueIps: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (typeFilter) params.set("type", typeFilter);
    if (search) params.set("search", search);
    fetch(`/api/admin/access-logs?${params}`)
      .then(r => r.json())
      .then(data => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setStats(data.stats || { todayVisits: 0, todayLogins: 0, todayUniqueIps: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, typeFilter]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>접속/로그인 기록</h1>

      {/* 오늘 통계 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "오늘 방문", value: stats.todayVisits, color: "var(--brand)" },
          { label: "오늘 로그인", value: stats.todayLogins, color: "#16a34a" },
          { label: "고유 IP", value: stats.todayUniqueIps, color: "#8b5cf6" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value.toLocaleString()}</p>
            <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 flex-wrap">
        {[
          { val: "", label: "전체" },
          { val: "visit", label: "방문" },
          { val: "login", label: "로그인" },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => { setTypeFilter(f.val); setPage(1); }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{
              background: typeFilter === f.val ? "var(--brand)" : "var(--surface)",
              color: typeFilter === f.val ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >{f.label}</button>
        ))}
        <div className="flex-1" />
        <div className="flex gap-1">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchData()}
            placeholder="IP / 닉네임 / 경로 검색"
            className="rounded-lg px-3 py-1.5 text-xs w-48"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button onClick={() => { setPage(1); fetchData(); }} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--brand)" }}>검색</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>일시</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>유형</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>유저</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>IP</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>기기</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>브라우저</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>OS</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>경로</th>
              <th className="px-2 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>접속경로</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>로딩중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>기록 없음</td></tr>
            ) : logs.map((log, idx) => (
              <tr key={log.id} style={{ background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                <td className="px-2 py-1.5 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(log.createdAt)}</td>
                <td className="px-2 py-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                    background: log.type === "login" ? "#dcfce7" : "#dbeafe",
                    color: log.type === "login" ? "#16a34a" : "#3b82f6",
                  }}>{log.type === "login" ? "로그인" : "방문"}</span>
                </td>
                <td className="px-2 py-1.5">
                  {log.userId ? (
                    <a href={`/admin/users/${log.userId}`} className="text-blue-600 hover:underline font-bold">{log.nickname || log.username}</a>
                  ) : (
                    <span style={{ color: "var(--text-secondary)" }}>비회원</span>
                  )}
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>{log.ip}</td>
                <td className="px-2 py-1.5" style={{ color: "var(--text-secondary)" }}>{log.device}</td>
                <td className="px-2 py-1.5" style={{ color: "var(--text-secondary)" }}>{log.browser}</td>
                <td className="px-2 py-1.5" style={{ color: "var(--text-secondary)" }}>{log.os}</td>
                <td className="px-2 py-1.5 max-w-[120px] truncate" style={{ color: "var(--text-primary)" }}>{log.path}</td>
                <td className="px-2 py-1.5 max-w-[120px] truncate" style={{ color: "var(--text-secondary)" }}>{log.referer || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>이전</button>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{page} / {totalPages} ({total.toLocaleString()}건)</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>다음</button>
        </div>
      )}
    </div>
  );
}

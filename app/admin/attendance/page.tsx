"use client";

import { useState, useEffect } from "react";

interface AttendanceRecord {
  id: number;
  userId: number;
  nickname: string;
  username: string;
  date: string;
  points: number;
  streak: number;
  createdAt: string;
}

interface Stats {
  todayCount: number;
  totalCount: number;
  avgStreak: number;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ todayCount: 0, totalCount: 0, avgStreak: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (search) params.set("search", search);
    if (dateFilter) params.set("date", dateFilter);
    fetch(`/api/admin/attendance?${params}`)
      .then(r => r.json())
      .then(data => {
        setRecords(data.records || []);
        setTotal(data.total || 0);
        setStats(data.stats || { todayCount: 0, totalCount: 0, avgStreak: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>출석 내역</h1>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-black" style={{ color: "var(--brand)" }}>{stats.todayCount}</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>오늘 출석</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-black" style={{ color: "#10b981" }}>{stats.totalCount.toLocaleString()}</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>누적 출석</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-2xl font-black" style={{ color: "#8b5cf6" }}>{stats.avgStreak}일</p>
          <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>평균 연속</p>
        </div>
      </div>

      {/* 검색 */}
      <div className="flex gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (setPage(1), fetchData())}
          placeholder="닉네임 / 아이디 검색"
          className="rounded-lg px-3 py-1.5 text-xs w-44"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button onClick={() => { setPage(1); fetchData(); }} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--brand)" }}>검색</button>
        <button onClick={() => { setSearch(""); setDateFilter(""); setPage(1); setTimeout(fetchData, 0); }} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>초기화</button>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>ID</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>닉네임</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>아이디</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>출석일</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>연속</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: "var(--text-secondary)" }}>포인트</th>
              <th className="px-3 py-2 text-center font-bold" style={{ color: "var(--text-secondary)" }}>시각</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>로딩중...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center" style={{ color: "var(--text-secondary)" }}>출석 기록 없음</td></tr>
            ) : records.map((r, idx) => (
              <tr key={r.id} style={{ background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{r.id}</td>
                <td className="px-3 py-2 font-bold"><a href={`/admin/users/${r.userId}`} className="text-blue-600 hover:underline">{r.nickname}</a></td>
                <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{r.username}</td>
                <td className="px-3 py-2 text-center" style={{ color: "var(--text-primary)" }}>{r.date}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{
                    background: r.streak >= 30 ? "#fef3c7" : r.streak >= 7 ? "#dbeafe" : "var(--bg)",
                    color: r.streak >= 30 ? "#92400e" : r.streak >= 7 ? "#1d4ed8" : "var(--text-primary)",
                  }}>
                    {r.streak}일
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-bold" style={{ color: "var(--brand)" }}>+{r.points}P</td>
                <td className="px-3 py-2 text-center" style={{ color: "var(--text-secondary)" }}>{formatTime(r.createdAt)}</td>
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

"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

interface User {
  id: number;
  username: string;
  nickname: string;
  role: string;
  points: number;
  exp: number;
  isActive: boolean;
  createdAt: string;
  _count: { chatMessages: number; pointExchanges: number };
}

const ROLES = ["", "USER", "PICKSTER", "BJ", "ADMIN", "SUPERADMIN"];
const ROLE_LABEL: Record<string, string> = {
  USER: "일반", PICKSTER: "픽스터", BJ: "BJ", ADMIN: "관리자", SUPERADMIN: "최고관리자",
};
const ROLE_COLOR: Record<string, string> = {
  USER: "#6b7280", PICKSTER: "#3b82f6", BJ: "#8b5cf6", ADMIN: "#f59e0b", SUPERADMIN: "#ef4444",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchUsers = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    fetch(`/api/admin/users?${params}`).then(r => r.json()).then(d => {
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
    });
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">회원 관리 <span className="text-sm font-normal text-gray-400 ml-2">총 {total}명</span></h1>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-1">
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="닉네임, 아이디, 이름 검색"
            className="h-8 px-3 text-[13px] border border-gray-300 rounded focus:outline-none focus:border-blue-400 w-52"
          />
          <button type="submit" className="h-8 px-3 bg-gray-800 text-white text-[12px] font-bold rounded">검색</button>
        </form>
        <select
          value={roleFilter}
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-8 px-2 text-[13px] border border-gray-300 rounded"
        >
          {ROLES.map(r => <option key={r} value={r}>{r ? ROLE_LABEL[r] : "전체 등급"}</option>)}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">아이디</th>
              <th className="px-3 py-2.5 text-left font-semibold">닉네임</th>
              <th className="px-3 py-2.5 text-center font-semibold">등급</th>
              <th className="px-3 py-2.5 text-right font-semibold">포인트</th>
              <th className="px-3 py-2.5 text-right font-semibold">경험치</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-center font-semibold">가입일</th>
              <th className="px-3 py-2.5 text-center font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{u.id}</td>
                <td className="px-3 py-2"><a href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline">{u.username}</a></td>
                <td className="px-3 py-2 font-semibold"><a href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline">{u.nickname}</a></td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: `${ROLE_COLOR[u.role]}15`, color: ROLE_COLOR[u.role] }}>
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">{u.points.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">{u.exp.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] font-bold ${u.isActive ? "text-green-600" : "text-red-500"}`}>
                    {u.isActive ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-center">
                  <Link href={`/admin/users/${u.id}`} className="text-[12px] font-bold text-blue-600 hover:underline">상세</Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
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

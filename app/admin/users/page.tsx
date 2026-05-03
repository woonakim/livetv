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
  phone: string | null;
  phoneVerified: boolean;
  referredBy: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  level: { level: number; name: string; badge: string; color: string; bgColor: string };
  _count: { chatMessages: number; pointExchanges: number };
}

const ROLES = ["", "USER", "PICKSTER", "BJ", "ADMIN", "SUPERADMIN"];
const ROLE_LABEL: Record<string, string> = {
  USER: "일반", PICKSTER: "픽스터", BJ: "BJ", ADMIN: "관리자", SUPERADMIN: "최고관리자",
};
const ROLE_COLOR: Record<string, string> = {
  USER: "#6b7280", PICKSTER: "#3b82f6", BJ: "#8b5cf6", ADMIN: "#f59e0b", SUPERADMIN: "#ef4444",
};

function fmtDateOnly(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function fmtDateTime(d: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type SortField = "id" | "username" | "nickname" | "role" | "points" | "exp" | "lastLoginAt" | "createdAt" | "isActive" | "phone";

interface SortHeaderProps { label: string; field: SortField; sort: SortField; order: "asc" | "desc"; onChange: (f: SortField) => void; align?: string; }
function SortHeader({ label, field, sort, order, onChange, align = "left" }: SortHeaderProps) {
  const active = sort === field;
  const arrow = !active ? "⇅" : order === "asc" ? "▲" : "▼";
  return (
    <th className={`px-3 py-2.5 text-${align} font-semibold cursor-pointer select-none hover:bg-gray-100`} onClick={() => onChange(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? "text-blue-600" : "text-gray-300"}`}>{arrow}</span>
      </span>
    </th>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortField>("id");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchUsers = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sort", sort);
    params.set("order", order);
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (verifiedOnly) params.set("verifiedOnly", "1");
    fetch(`/api/admin/users?${params}`).then(r => r.json()).then(d => {
      setUsers(d.users || []);
      setTotal(d.total || 0);
      setTotalPages(d.totalPages || 1);
      setSelected(new Set());
    });
  }, [page, search, roleFilter, verifiedOnly, sort, order]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleSort = (field: SortField) => {
    if (sort === field) setOrder(o => o === "asc" ? "desc" : "asc");
    else { setSort(field); setOrder("desc"); }
    setPage(1);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const runBulk = async () => {
    if (selected.size === 0 || !bulkAction) return;
    if (!confirm(`${selected.size}명에게 [${bulkAction}] 일괄 적용하시겠습니까?`)) return;
    setBulkBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), action: bulkAction }),
    });
    const j = await res.json();
    setBulkBusy(false);
    if (j.ok) { alert(`${j.count}명 처리 완료`); fetchUsers(); }
    else alert(j.error || "오류");
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (verifiedOnly) params.set("verifiedOnly", "1");
    window.location.href = `/api/admin/users/export?${params}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">회원 관리 <span className="text-sm font-normal text-gray-400 ml-2">총 {total.toLocaleString()}명</span></h1>
        <button onClick={exportCsv} className="h-8 px-3 bg-green-600 text-white text-[12px] font-bold rounded">CSV 내보내기</button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearch} className="flex gap-1">
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="닉네임, 아이디, 이름 검색" className="h-8 px-3 text-[13px] border border-gray-300 rounded w-52" />
          <button type="submit" className="h-8 px-3 bg-gray-800 text-white text-[12px] font-bold rounded">검색</button>
        </form>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="h-8 px-2 text-[13px] border border-gray-300 rounded">
          {ROLES.map(r => <option key={r} value={r}>{r ? ROLE_LABEL[r] : "전체 등급"}</option>)}
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer text-[12px] font-bold text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50">
          <input type="checkbox" checked={verifiedOnly} onChange={e => { setVerifiedOnly(e.target.checked); setPage(1); }} />
          인증회원만
        </label>
      </div>

      {/* Bulk 액션 바 */}
      {selected.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 flex items-center gap-2">
          <span className="text-[12px] font-bold text-amber-800">{selected.size}명 선택됨</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="h-8 px-2 text-[12px] border border-amber-300 rounded">
            <option value="">동작 선택</option>
            <option value="activate">활성화</option>
            <option value="deactivate">비활성화</option>
            <option value="role:USER">등급 → 일반</option>
            <option value="role:PICKSTER">등급 → 픽스터</option>
            <option value="role:BJ">등급 → BJ</option>
          </select>
          <button onClick={runBulk} disabled={!bulkAction || bulkBusy} className="h-8 px-3 bg-amber-600 text-white text-[12px] font-bold rounded disabled:opacity-40">{bulkBusy ? "처리..." : "일괄 적용"}</button>
          <button onClick={() => setSelected(new Set())} className="h-8 px-3 text-[12px] text-gray-600 hover:underline">선택 해제</button>
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-2 py-2.5 text-center w-8">
                <input type="checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} />
              </th>
              <SortHeader label="ID" field="id" sort={sort} order={order} onChange={handleSort} />
              <SortHeader label="아이디" field="username" sort={sort} order={order} onChange={handleSort} />
              <SortHeader label="닉네임" field="nickname" sort={sort} order={order} onChange={handleSort} />
              <SortHeader label="등급" field="role" sort={sort} order={order} onChange={handleSort} align="center" />
              <SortHeader label="레벨" field="exp" sort={sort} order={order} onChange={handleSort} align="center" />
              <SortHeader label="전화" field="phone" sort={sort} order={order} onChange={handleSort} />
              <SortHeader label="포인트" field="points" sort={sort} order={order} onChange={handleSort} align="right" />
              <SortHeader label="EXP" field="exp" sort={sort} order={order} onChange={handleSort} align="right" />
              <th className="px-3 py-2.5 text-left font-semibold">추천인</th>
              <SortHeader label="상태" field="isActive" sort={sort} order={order} onChange={handleSort} align="center" />
              <SortHeader label="가입 / 최근접속" field="createdAt" sort={sort} order={order} onChange={handleSort} align="center" />
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                </td>
                <td className="px-3 py-2 text-gray-500">{u.id}</td>
                <td className="px-3 py-2"><Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline">{u.username}</Link></td>
                <td className="px-3 py-2 font-semibold"><Link href={`/admin/users/${u.id}`} className="text-blue-600 hover:underline">{u.nickname}</Link></td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: `${ROLE_COLOR[u.role]}15`, color: ROLE_COLOR[u.role] }}>{ROLE_LABEL[u.role] || u.role}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1"
                    style={{ background: u.level.bgColor || "#f3f4f6", color: u.level.color || "#374151" }}
                    title={u.level.name || `Lv ${u.level.level}`}>
                    {u.level.badge ? <span>{u.level.badge}</span> : null}
                    <span>Lv {u.level.level}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 text-[12px]">
                  <div className="flex items-center gap-1">
                    <span>{u.phone || "-"}</span>
                    {u.phoneVerified && <i className="fas fa-check-circle text-green-500 text-[10px]" title="인증완료" />}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">{u.points.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-500">{u.exp.toLocaleString()}</td>
                <td className="px-3 py-2 text-gray-500 text-[12px]">{u.referredBy || "-"}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[11px] font-bold ${u.isActive ? "text-green-600" : "text-red-500"}`}>{u.isActive ? "활성" : "비활성"}</span>
                </td>
                <td className="px-3 py-2 text-center text-[10px] leading-tight">
                  <div className="text-gray-700 font-semibold">{fmtDateOnly(u.createdAt)}</div>
                  {/* 로그인 기록 없으면 가입 = 첫 로그인이므로 createdAt 표시 */}
                  <div className="text-gray-400">({fmtDateTime(u.lastLoginAt || u.createdAt)})</div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={12} className="py-8 text-center text-gray-400">검색 결과가 없습니다.</td></tr>
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

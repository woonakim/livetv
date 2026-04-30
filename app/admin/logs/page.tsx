"use client";

import { useEffect, useState, useCallback } from "react";

interface LogItem {
  id: number; userId: number; nickname: string; action: string;
  target: string; detail: string; ip: string; createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "user.update": "회원 수정",
  "bj.update": "BJ 관리",
  "event.create": "이벤트 생성",
  "event.update": "이벤트 수정",
  "event.delete": "이벤트 삭제",
  "notice.create": "공지 등록",
  "notice.update": "공지 수정",
  "notice.delete": "공지 삭제",
  "site.settings.update": "사이트 설정",
  "reward.update": "보상 설정",
  "exchange.update": "포인트 교환",
};

const ACTION_COLORS: Record<string, string> = {
  create: "#16a34a",
  update: "#2563eb",
  delete: "#dc2626",
  settings: "#d97706",
};

function getColor(action: string) {
  if (action.includes("delete")) return ACTION_COLORS.delete;
  if (action.includes("create")) return ACTION_COLORS.create;
  if (action.includes("settings")) return ACTION_COLORS.settings;
  return ACTION_COLORS.update;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    fetch(`/api/admin/logs?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0); })
      .finally(() => setLoading(false));
  }, [page, search, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const parseDetail = (detail: string) => {
    if (!detail) return "";
    try {
      const obj = JSON.parse(detail);
      return Object.entries(obj).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(", ");
    } catch { return detail; }
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
        감사 로그 <span className="text-sm font-normal" style={{ color: "var(--text-secondary)" }}>{total}건</span>
      </h1>

      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="검색 (닉네임, 대상, 내용)"
          className="flex-1 h-8 px-3 rounded text-[13px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="h-8 px-2 rounded text-[13px]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="">전체 액션</option>
          <option value="user">회원 관련</option>
          <option value="bj">BJ 관련</option>
          <option value="event">이벤트</option>
          <option value="notice">공지</option>
          <option value="site">사이트 설정</option>
          <option value="reward">보상</option>
          <option value="exchange">교환</option>
        </select>
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
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>시간</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>관리자</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>액션</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>대상</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>변경 내용</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 ? "var(--bg)" : "var(--surface)", borderTop: "1px solid var(--border)" }}>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{formatDate(l.createdAt)}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: "var(--text-primary)" }}>{l.nickname}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: getColor(l.action) }}>
                      {ACTION_LABELS[l.action] || l.action}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{l.target}</td>
                  <td className="px-3 py-2 max-w-[300px] truncate" style={{ color: "var(--text-secondary)" }} title={parseDetail(l.detail)}>{parseDetail(l.detail)}</td>
                  <td className="px-3 py-2 font-mono text-[10px]" style={{ color: "var(--text-secondary)" }}>{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 30 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded text-[12px] font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page <= 1 ? 0.3 : 1 }}>이전</button>
          <span className="px-3 py-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>{page} / {Math.ceil(total / 30)}</span>
          <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded text-[12px] font-bold" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", opacity: page >= Math.ceil(total / 30) ? 0.3 : 1 }}>다음</button>
        </div>
      )}
    </div>
  );
}

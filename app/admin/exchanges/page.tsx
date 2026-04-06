"use client";

import { useEffect, useState, useCallback } from "react";

interface Exchange {
  id: number; userId: number; amount: number; status: string; productName: string; memo: string | null; createdAt: string;
  user: { id: number; nickname: string; username: string };
}

const STATUS_LABEL: Record<string, string> = { PENDING: "대기중", PROCESSING: "처리중", COMPLETED: "완료", CANCELLED: "취소" };
const STATUS_COLOR: Record<string, string> = { PENDING: "#f59e0b", PROCESSING: "#3b82f6", COMPLETED: "#10b981", CANCELLED: "#ef4444" };

export default function AdminExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/admin/exchanges${params}`).then(r => r.json()).then(d => {
      setExchanges(d.exchanges || []);
      setCounts(d.counts || {});
    });
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };

  const changeStatus = async (id: number, status: string) => {
    if (status === "CANCELLED" && !confirm("취소하면 포인트가 환불됩니다. 계속하시겠습니까?")) return;
    await fetch(`/api/admin/exchanges/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    flash(`상태가 ${STATUS_LABEL[status]}(으)로 변경되었습니다.`);
    load();
  };

  const saveMemo = async (id: number, memo: string) => {
    await fetch(`/api/admin/exchanges/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memo }) });
    flash("메모가 저장되었습니다.");
  };

  const formatDate = (d: string) => new Date(d).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div>
      <h1 className="text-lg font-bold text-gray-800 mb-4">포인트 교환 처리</h1>

      {/* 상태별 카운트 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ key: "", label: "전체", count: counts.all }, { key: "PENDING", label: "대기중", count: counts.PENDING }, { key: "PROCESSING", label: "처리중", count: counts.PROCESSING }, { key: "COMPLETED", label: "완료", count: counts.COMPLETED }, { key: "CANCELLED", label: "취소", count: counts.CANCELLED }].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`px-3 py-1.5 text-[12px] font-bold rounded border transition-colors ${filter === s.key ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300"}`}>
            {s.label} ({s.count ?? 0})
          </button>
        ))}
      </div>

      {msg && <div className="mb-3 px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <th className="px-3 py-2.5 text-left font-semibold">ID</th>
              <th className="px-3 py-2.5 text-left font-semibold">회원</th>
              <th className="px-3 py-2.5 text-left font-semibold">상품</th>
              <th className="px-3 py-2.5 text-right font-semibold">금액</th>
              <th className="px-3 py-2.5 text-center font-semibold">상태</th>
              <th className="px-3 py-2.5 text-left font-semibold">메모</th>
              <th className="px-3 py-2.5 text-center font-semibold">신청일</th>
              <th className="px-3 py-2.5 text-center font-semibold">처리</th>
            </tr>
          </thead>
          <tbody>
            {exchanges.map(ex => (
              <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{ex.id}</td>
                <td className="px-3 py-2 font-semibold"><a href={`/admin/users/${ex.user.id}`} className="text-blue-600 hover:underline">{ex.user.nickname}</a></td>
                <td className="px-3 py-2 text-gray-700">{ex.productName}</td>
                <td className="px-3 py-2 text-right font-mono font-bold text-blue-600">{ex.amount.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: `${STATUS_COLOR[ex.status]}15`, color: STATUS_COLOR[ex.status] }}>
                    {STATUS_LABEL[ex.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <input
                    defaultValue={ex.memo || ""}
                    onBlur={e => { if (e.target.value !== (ex.memo || "")) saveMemo(ex.id, e.target.value); }}
                    placeholder="메모 입력..."
                    className="w-full h-7 px-2 text-[12px] border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                  />
                </td>
                <td className="px-3 py-2 text-center text-gray-500 text-[12px]">{formatDate(ex.createdAt)}</td>
                <td className="px-3 py-2 text-center">
                  {ex.status === "PENDING" && (
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => changeStatus(ex.id, "PROCESSING")} className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">처리중</button>
                      <button onClick={() => changeStatus(ex.id, "CANCELLED")} className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">취소</button>
                    </div>
                  )}
                  {ex.status === "PROCESSING" && (
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => changeStatus(ex.id, "COMPLETED")} className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">완료</button>
                      <button onClick={() => changeStatus(ex.id, "CANCELLED")} className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded">취소</button>
                    </div>
                  )}
                  {(ex.status === "COMPLETED" || ex.status === "CANCELLED") && (
                    <span className="text-[11px] text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            {exchanges.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">교환 내역이 없습니다.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

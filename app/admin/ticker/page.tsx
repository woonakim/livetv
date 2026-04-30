"use client";

import { useEffect, useState } from "react";

export default function AdminTickerPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/site-settings").then(r => r.json()).then(d => {
      setTicker(d.noticeTicker || "");
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noticeTicker: ticker }),
    });
    setSaving(false);
    setMsg("저장되었습니다.");
    setTimeout(() => setMsg(""), 2000);
  };

  if (loading) return <p className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>불러오는 중...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>한줄 공지 관리</h1>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <label className="text-[11px] font-bold block mb-1" style={{ color: "var(--text-secondary)" }}>메인 페이지 상단 한줄 공지 내용</label>
        <textarea
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-[13px] resize-y"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          placeholder="한줄 공지 내용을 입력하세요"
        />
        <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)" }}>메인 페이지 상단에 스크롤 텍스트로 표시됩니다.</p>

        {/* 미리보기 */}
        <div className="mt-3">
          <p className="text-[11px] font-bold mb-1" style={{ color: "var(--text-secondary)" }}>미리보기</p>
          <div className="rounded p-2 px-3 overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <i className="fas fa-bullhorn text-[12px] shrink-0" style={{ color: "var(--brand)" }} />
              <div className="overflow-hidden">
                <div className="scrolling-text text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {ticker || "(내용 없음)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="h-8 px-6 rounded text-[12px] font-bold text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}

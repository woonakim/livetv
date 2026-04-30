"use client";

import { useState, useEffect } from "react";
import ImageUpload from "@/components/ui/ImageUpload";

interface Level {
  level: number;
  name: string;
  requiredExp: number;
  badge: string;
  color: string;
  bgColor: string;
  birthdayBonusEnabled: boolean;
}

export default function AdminLevelsPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/levels").then(r => r.json()).then(d => setLevels(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const updateLevel = (idx: number, field: keyof Level, value: string | number | boolean) => {
    setLevels(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const addLevel = () => {
    const nextLv = levels.length > 0 ? levels[levels.length - 1].level + 1 : 1;
    const lastExp = levels.length > 0 ? levels[levels.length - 1].requiredExp : 0;
    setLevels([...levels, { level: nextLv, name: `레벨 ${nextLv}`, requiredExp: lastExp * 2 || 100, badge: "⭐", color: "#3b82f6", bgColor: "#eff6ff", birthdayBonusEnabled: false }]);
  };

  const removeLevel = (idx: number) => {
    if (levels.length <= 1) return;
    setLevels(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/levels", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levels }),
      });
      if (res.ok) { setMsg("저장되었습니다"); setTimeout(() => setMsg(""), 2000); }
      else alert("저장 실패");
    } catch { alert("네트워크 오류"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-center text-sm" style={{ color: "var(--text-secondary)" }}>로딩중...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>레벨 설정</h1>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>레벨별 필요 경험치, 이름, 뱃지를 설정합니다</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addLevel} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>+ 레벨 추가</button>
          <button onClick={handleSave} disabled={saving} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--brand)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "저장 중..." : "일괄 저장"}
          </button>
        </div>
      </div>

      {msg && <div className="px-3 py-2 rounded text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{msg}</div>}

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: "var(--bg)" }}>
              <th className="px-3 py-2 text-center font-bold w-16" style={{ color: "var(--text-secondary)" }}>레벨</th>
              <th className="px-3 py-2 text-center font-bold w-16" style={{ color: "var(--text-secondary)" }}>뱃지</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "var(--text-secondary)" }}>이름</th>
              <th className="px-3 py-2 text-right font-bold" style={{ color: "var(--text-secondary)" }}>필요 경험치</th>
              <th className="px-3 py-2 text-center font-bold w-20" style={{ color: "var(--text-secondary)" }}>글자색</th>
              <th className="px-3 py-2 text-center font-bold w-20" style={{ color: "var(--text-secondary)" }}>배경색</th>
              <th className="px-3 py-2 text-center font-bold w-20" style={{ color: "var(--text-secondary)" }} title="이 레벨에 도달한 유저에게 생일 자동 보상 지급">🎂 생일</th>
              <th className="px-3 py-2 text-center font-bold w-16" style={{ color: "var(--text-secondary)" }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid var(--border)", background: idx % 2 === 1 ? "var(--bg)" : "var(--surface)" }}>
                <td className="px-3 py-2 text-center font-black" style={{ color: "var(--brand)" }}>{l.level}</td>
                <td className="px-3 py-2 text-center">
                  {l.badge.startsWith("/") ? (
                    <ImageUpload value={l.badge} onChange={v => updateLevel(idx, "badge", v)} category="badges" label="" width={32} height={32} />
                  ) : (
                    <div className="flex items-center gap-1 justify-center">
                      <input value={l.badge} onChange={e => updateLevel(idx, "badge", e.target.value)} className="w-10 h-7 text-center text-lg rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)" }} />
                      <button type="button" onClick={() => updateLevel(idx, "badge", "/uploads/badges/")} className="text-[9px] px-1 py-0.5 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }} title="이미지로 변경">📷</button>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  <input value={l.name} onChange={e => updateLevel(idx, "name", e.target.value)} className="w-full h-7 px-2 text-[13px] rounded font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </td>
                <td className="px-3 py-2 text-right">
                  <input type="number" value={l.requiredExp} onChange={e => updateLevel(idx, "requiredExp", parseInt(e.target.value) || 0)} className="w-28 h-7 px-2 text-right text-[13px] font-mono rounded" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <input type="color" value={l.color || "#3b82f6"} onChange={e => updateLevel(idx, "color", e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" style={{ background: "transparent" }} />
                    <input value={l.color || ""} onChange={e => updateLevel(idx, "color", e.target.value)} placeholder="#3b82f6" className="w-16 h-7 px-1 text-[10px] font-mono rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <input type="color" value={l.bgColor || "#eff6ff"} onChange={e => updateLevel(idx, "bgColor", e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 p-0" style={{ background: "transparent" }} />
                    <input value={l.bgColor || ""} onChange={e => updateLevel(idx, "bgColor", e.target.value)} placeholder="#eff6ff" className="w-16 h-7 px-1 text-[10px] font-mono rounded text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!l.birthdayBonusEnabled}
                    onChange={e => updateLevel(idx, "birthdayBonusEnabled", e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                    title="이 레벨에서 생일 보상 자동 지급"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => removeLevel(idx)} className="text-[11px] text-red-500 hover:underline">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 미리보기 */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>미리보기</h2>
        <div className="flex flex-wrap gap-2">
          {levels.map(l => (
            <div key={l.level} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: l.bgColor || "var(--bg)", border: "1px solid var(--border)" }}>
              {l.badge.startsWith("/") ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={l.badge} alt="" className="w-5 h-5 object-contain" />
              ) : (
                <span>{l.badge}</span>
              )}
              <span className="text-[12px] font-bold" style={{ color: l.color || "var(--text-primary)" }}>Lv.{l.level} {l.name}</span>
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{l.requiredExp.toLocaleString()} EXP</span>
            </div>
          ))}
        </div>
      </div>

      {/* 포인트 교환 락업 (기프티콘·제휴 일괄) */}
      <ExchangeLockSection />
    </div>
  );
}

// ─── 포인트 교환 레벨 락업 섹션 ─────────────
function ExchangeLockSection() {
  const [enabled, setEnabled] = useState(true);
  const [minLevel, setMinLevel] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/site-settings").then(r => r.json()).then(d => {
      setEnabled(!!d?.exchangeLockEnabled);
      setMinLevel(Number(d?.exchangeMinLevel ?? 3));
    }).catch(() => {});
  }, []);

  const patch = async (body: Record<string, unknown>) => {
    setSaving(true);
    await fetch("/api/admin/site-settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setSaving(false);
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>포인트 교환 락업 (기프티콘·제휴 일괄)</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>설정한 레벨에 도달하지 않은 유저는 교환 신청이 차단됩니다.</p>
      </div>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface)" }}>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>락업 활성화</p>
        <button
          onClick={async () => { const v = !enabled; setEnabled(v); await patch({ exchangeLockEnabled: v }); }}
          disabled={saving}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: enabled ? "var(--brand)" : "#d1d5db" }}
        >
          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform" style={{ left: enabled ? "22px" : "2px" }} />
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>최소 레벨</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={99}
            value={minLevel}
            onChange={e => setMinLevel(parseInt(e.target.value) || 0)}
            onBlur={e => patch({ exchangeMinLevel: parseInt(e.target.value) || 0 })}
            className="w-24 rounded px-2 py-1 text-sm text-right"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>레벨 이상</span>
        </div>
      </div>
    </div>
  );
}

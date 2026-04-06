"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (name: string) => void;
  logoMap: Record<string, string>;
  record?: string;
  onRecordChange?: (v: string) => void;
}

export default function TeamInput({ label, value, onChange, logoMap, record, onRecordChange }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logo = logoMap[value] || "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (v.length >= 1) {
      const matches = Object.keys(logoMap)
        .filter(k => {
          // 영문만으로 이루어진 키는 자동완성에서 제외 (한글 팀명만 표시)
          const hasKorean = /[가-힣]/.test(k);
          const isAlphaOnly = /^[A-Za-z\s.'-]+$/.test(k);
          return (hasKorean || !isAlphaOnly) && k.toLowerCase().includes(v.toLowerCase());
        })
        .slice(0, 8);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectTeam = (name: string) => {
    onChange(name);
    setShowSuggestions(false);
  };

  const inputStyle = { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" };

  return (
    <div ref={wrapRef}>
      <label className="text-xs font-bold mb-1 block" style={{ color: "var(--text-secondary)" }}>{label}</label>
      <div className="relative">
        <div className="flex items-center gap-2">
          {logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={logo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: "1px solid var(--border)" }} />
          ) : (
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {value ? value[0] : "?"}
            </div>
          )}
          <input
            value={value}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
            placeholder="팀명 입력"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={inputStyle}
            required
          />
        </div>

        {/* 자동완성 */}
        {showSuggestions && (
          <div className="absolute top-full left-10 right-0 z-20 mt-1 rounded-lg overflow-hidden shadow-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {suggestions.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => selectTeam(name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:opacity-80 transition-colors"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                {logoMap[name] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={logoMap[name]} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: "var(--bg)", color: "var(--text-secondary)" }}>{name[0]}</span>
                )}
                <span style={{ color: "var(--text-primary)" }}>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {onRecordChange !== undefined && (
        <input
          value={record || ""}
          onChange={e => onRecordChange?.(e.target.value)}
          placeholder="전적 (선택)"
          className="w-full rounded-lg px-3 py-2 text-sm mt-1"
          style={inputStyle}
        />
      )}
    </div>
  );
}

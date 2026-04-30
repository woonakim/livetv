"use client";

import { useState, useEffect } from "react";

interface GoldSettings {
  enabled: boolean;
  // 적용 위치
  header: boolean;         // 헤더 하단 라인
  cards: boolean;          // 카드/섹션 테두리
  sectionTitle: boolean;   // 섹션 타이틀 포인트
  buttons: boolean;        // 브랜드 버튼
  sidebar: boolean;        // 사이드바 테두리
  inputs: boolean;         // 인풋 포커스
  badges: boolean;         // 뱃지/라벨
  links: boolean;          // 링크 호버
  dividers: boolean;       // 구분선
  scrollbar: boolean;      // 스크롤바
  // 라이브 페이지 전용
  chatBorder: boolean;
  chatHeader: boolean;
  bjInfoBar: boolean;
  playerBorder: boolean;
  pinnedMsg: boolean;
  // 스타일
  goldTone: string;
  borderWidth: number;
  glowEnabled: boolean;
}

const GOLD_TONES = [
  { name: "클래식", val: "212,175,55" },
  { name: "로즈", val: "183,110,121" },
  { name: "샴페인", val: "207,181,130" },
  { name: "앤틱", val: "175,145,70" },
  { name: "브라이트", val: "255,215,0" },
  { name: "화이트", val: "200,200,180" },
];

const DEFAULT: GoldSettings = {
  enabled: false,
  header: true, cards: true, sectionTitle: true, buttons: false,
  sidebar: true, inputs: false, badges: true, links: false,
  dividers: false, scrollbar: false,
  chatBorder: true, chatHeader: true, bjInfoBar: true,
  playerBorder: false, pinnedMsg: true,
  goldTone: "212,175,55", borderWidth: 1, glowEnabled: true,
};

function buildCSS(s: GoldSettings): string {
  if (!s.enabled) return "";
  const g = `rgb(${s.goldTone})`;
  const gl = `rgba(${s.goldTone},0.15)`;
  const gw = `rgba(${s.goldTone},0.4)`;
  const bw = `${s.borderWidth}px`;
  const glow = s.glowEnabled ? `box-shadow: 0 0 12px ${gw};` : "";
  const glowSm = s.glowEnabled ? `box-shadow: 0 0 6px ${gw};` : "";

  let css = `:root{--gold:${g};--gold-light:${gl};--gold-glow:${gw};--gold-border-w:${bw}}\n`;

  // ── 헤더 하단 라인 ──
  if (s.header) {
    css += `header, [class*="sticky"][class*="top-0"] { border-bottom: ${bw} solid ${g} !important; ${glowSm} }\n`;
  }

  // ── 카드/섹션 테두리 ──
  if (s.cards) {
    css += `[style*="border: 1px solid var(--border)"], [style*="1px solid var(--border)"] { border-color: ${g} !important; }\n`;
    css += `.rounded-lg[style*="var(--surface)"], .rounded-xl[style*="var(--surface)"] { border: ${bw} solid ${g} !important; ${glowSm} }\n`;
    // 라이브게임 카드
    css += `[style*="boxShadow"][class*="rounded"] { border: ${bw} solid ${g} !important; }\n`;
  }

  // ── 섹션 타이틀 포인트 ──
  if (s.sectionTitle) {
    css += `[style*="color: var(--brand)"][class*="font-semibold"], [style*="color: var(--brand)"][class*="font-bold"] { color: ${g} !important; text-shadow: 0 0 8px ${gw}; }\n`;
    css += `h1[style*="var(--brand)"], h2[style*="var(--brand)"] { color: ${g} !important; }\n`;
  }

  // ── 브랜드 버튼 ──
  if (s.buttons) {
    css += `[style*="background: var(--brand)"], .btn-brand, button[style*="var(--brand)"] { background: linear-gradient(135deg, ${g}, rgba(${s.goldTone},0.7)) !important; ${glowSm} }\n`;
    css += `a[style*="var(--brand)"][class*="rounded"] { background: linear-gradient(135deg, ${g}, rgba(${s.goldTone},0.7)) !important; }\n`;
  }

  // ── 사이드바 테두리 ──
  if (s.sidebar) {
    css += `aside, [class*="w-\\[220px\\]"], [class*="w-\\[240px\\]"], [class*="w-\\[260px\\]"] { border-color: ${g} !important; }\n`;
    // 우측 채팅 사이드바
    css += `[class*="w-\\[320px\\]"], [class*="w-\\[368px\\]"] { border-left-color: ${g} !important; ${glowSm} }\n`;
  }

  // ── 인풋 포커스 ──
  if (s.inputs) {
    css += `input:focus, textarea:focus, select:focus { border-color: ${g} !important; box-shadow: 0 0 0 2px ${gl} !important; outline: none !important; }\n`;
  }

  // ── 뱃지/라벨 ──
  if (s.badges) {
    css += `[class*="rounded-full"][class*="font-bold"][class*="text-\\["], [class*="rounded-full"][class*="font-bold"][class*="px-"] { border: 1px solid ${g} !important; }\n`;
    // LIVE 뱃지
    css += `[style*="background: #e74c3c"][class*="rounded"], span[style*="#e74c3c"] { box-shadow: 0 0 8px ${gw}; }\n`;
    // ON/OFF 뱃지
    css += `.bg-red-500\\/20 { border: 1px solid ${g}; }\n`;
  }

  // ── 링크 호버 ──
  if (s.links) {
    css += `a:hover { color: ${g} !important; }\n`;
    css += `a[style*="var(--brand)"] { color: ${g} !important; }\n`;
  }

  // ── 구분선 ──
  if (s.dividers) {
    css += `hr, [style*="borderBottom: 1px solid"], [style*="border-bottom: 1px solid"] { border-color: rgba(${s.goldTone},0.3) !important; }\n`;
    css += `[style*="borderTop: 1px solid"], [style*="border-top: 1px solid"] { border-color: rgba(${s.goldTone},0.3) !important; }\n`;
  }

  // ── 스크롤바 ──
  if (s.scrollbar) {
    css += `::-webkit-scrollbar-thumb { background: rgba(${s.goldTone},0.4) !important; }\n`;
    css += `* { scrollbar-color: rgba(${s.goldTone},0.4) transparent !important; }\n`;
  }

  // ── 라이브 전용: 채팅 영역 ──
  if (s.chatBorder) {
    css += `.lg\\:w-\\[368px\\] { border-left: ${bw} solid ${g} !important; ${glow} }\n`;
  }
  if (s.chatHeader) {
    css += `.lg\\:w-\\[368px\\] > div:first-child { border-bottom-color: ${g} !important; background: linear-gradient(135deg, ${gl}, transparent) !important; }\n`;
  }
  if (s.bjInfoBar) {
    css += `[style*="rgba(5,20,40,0.9)"] { border-top: ${bw} solid ${g} !important; border-bottom: ${bw} solid ${g} !important; ${glow} }\n`;
  }
  if (s.playerBorder) {
    css += `video { border: ${bw} solid ${g} !important; ${glow} }\n`;
  }
  if (s.pinnedMsg) {
    css += `[style*="rgba(59,130,246,0.15)"] { background: ${gl} !important; border-color: ${g} !important; }\n`;
  }

  // ── 네비게이션 활성 탭 ──
  if (s.header) {
    css += `[style*="border-bottom: 2px solid var(--brand)"] { border-bottom-color: ${g} !important; }\n`;
    css += `nav li:hover > a { border-bottom-color: ${g} !important; }\n`;
  }

  return css;
}

export default function GoldAccentPanel() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<GoldSettings>(DEFAULT);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"global" | "live">("global");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json())
      .then(d => setIsAdmin(d.user?.role === "ADMIN" || d.user?.role === "SUPERADMIN"))
      .catch(() => {});
  }, []);

  // CSS 주입
  useEffect(() => {
    let style = document.getElementById("gold-accent-css") as HTMLStyleElement;
    if (!style) {
      style = document.createElement("style");
      style.id = "gold-accent-css";
      document.head.appendChild(style);
    }
    style.textContent = buildCSS(settings);
    return () => { style.textContent = ""; };
  }, [settings]);

  const toggle = (key: keyof GoldSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isAdmin) return null;

  const GLOBAL_TOGGLES: { key: keyof GoldSettings; label: string }[] = [
    { key: "header", label: "헤더 / 네비게이션" },
    { key: "cards", label: "카드 / 섹션 테두리" },
    { key: "sectionTitle", label: "섹션 타이틀" },
    { key: "badges", label: "뱃지 / 라벨" },
    { key: "sidebar", label: "사이드바" },
    { key: "buttons", label: "브랜드 버튼" },
    { key: "inputs", label: "인풋 포커스" },
    { key: "links", label: "링크 호버" },
    { key: "dividers", label: "구분선" },
    { key: "scrollbar", label: "스크롤바" },
  ];

  const LIVE_TOGGLES: { key: keyof GoldSettings; label: string }[] = [
    { key: "chatBorder", label: "채팅 영역 테두리" },
    { key: "chatHeader", label: "채팅 헤더" },
    { key: "bjInfoBar", label: "BJ 정보바" },
    { key: "pinnedMsg", label: "고정 메시지" },
    { key: "playerBorder", label: "플레이어 테두리" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed z-[999] w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-lg transition-transform hover:scale-110"
        style={{ bottom: 80, left: 16, background: "linear-gradient(135deg, #d4af37, #b8860b)", color: "#fff", border: "2px solid rgba(255,255,255,0.3)" }}
        title="골드 악센트 설정"
      >
        ✦
      </button>

      {open && (
        <div className="fixed z-[999] rounded-xl shadow-2xl overflow-hidden" style={{ bottom: 140, left: 16, width: 310, maxHeight: "75vh", background: "#1a1a2e", border: "1px solid rgba(212,175,55,0.3)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(184,134,11,0.1))", borderBottom: "1px solid rgba(212,175,55,0.2)" }}>
            <span className="text-[13px] font-bold text-amber-300">✦ 골드 악센트</span>
            <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-sm">✕</button>
          </div>

          <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: "calc(75vh - 48px)" }}>
            {/* 마스터 토글 */}
            <ToggleRow label="골드 악센트 활성화" checked={settings.enabled} onChange={() => toggle("enabled")} bold />

            {settings.enabled && (
              <>
                {/* 골드 톤 */}
                <div>
                  <p className="text-[10px] font-bold text-white/50 mb-1.5">골드 톤</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {GOLD_TONES.map(t => (
                      <button key={t.name} onClick={() => setSettings(prev => ({ ...prev, goldTone: t.val }))}
                        className="flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all"
                        style={{ background: settings.goldTone === t.val ? "rgba(212,175,55,0.15)" : "transparent", border: settings.goldTone === t.val ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-5 h-5 rounded-full" style={{ background: `rgb(${t.val})`, boxShadow: `0 0 6px rgba(${t.val},0.4)` }} />
                        <span className="text-[8px] text-white/40">{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 두께 + 글로우 */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] text-white/50 mb-1">두께 {settings.borderWidth}px</p>
                    <input type="range" min={1} max={3} value={settings.borderWidth} onChange={e => setSettings(prev => ({ ...prev, borderWidth: parseInt(e.target.value) }))}
                      className="w-full h-1 rounded appearance-none cursor-pointer" style={{ background: "rgba(255,255,255,0.15)" }} />
                  </div>
                  <ToggleRow label="글로우" checked={settings.glowEnabled} onChange={() => toggle("glowEnabled")} />
                </div>

                {/* 탭 */}
                <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <button onClick={() => setTab("global")} className="flex-1 py-1 rounded text-[11px] font-bold transition-colors"
                    style={{ background: tab === "global" ? `rgba(${settings.goldTone},0.2)` : "transparent", color: tab === "global" ? `rgb(${settings.goldTone})` : "rgba(255,255,255,0.4)" }}>
                    전체 페이지
                  </button>
                  <button onClick={() => setTab("live")} className="flex-1 py-1 rounded text-[11px] font-bold transition-colors"
                    style={{ background: tab === "live" ? `rgba(${settings.goldTone},0.2)` : "transparent", color: tab === "live" ? `rgb(${settings.goldTone})` : "rgba(255,255,255,0.4)" }}>
                    라이브 전용
                  </button>
                </div>

                {/* 토글 목록 */}
                <div className="space-y-1">
                  {(tab === "global" ? GLOBAL_TOGGLES : LIVE_TOGGLES).map(t => (
                    <ToggleRow key={t.key} label={t.label} checked={!!settings[t.key]} onChange={() => toggle(t.key)} />
                  ))}
                </div>

                {/* 프리셋 */}
                <div>
                  <p className="text-[10px] font-bold text-white/50 mb-1.5">프리셋</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <PresetBtn label="풀 골드" onClick={() => setSettings(prev => ({
                      ...prev, header: true, cards: true, sectionTitle: true, buttons: true,
                      sidebar: true, inputs: true, badges: true, links: true, dividers: true, scrollbar: true,
                      chatBorder: true, chatHeader: true, bjInfoBar: true, playerBorder: true, pinnedMsg: true,
                    }))} />
                    <PresetBtn label="포인트만" onClick={() => setSettings(prev => ({
                      ...prev, header: true, cards: false, sectionTitle: true, buttons: false,
                      sidebar: false, inputs: false, badges: true, links: false, dividers: false, scrollbar: false,
                      chatBorder: false, chatHeader: true, bjInfoBar: false, playerBorder: false, pinnedMsg: false,
                    }))} />
                    <PresetBtn label="카드형" onClick={() => setSettings(prev => ({
                      ...prev, header: false, cards: true, sectionTitle: false, buttons: false,
                      sidebar: true, inputs: false, badges: false, links: false, dividers: false, scrollbar: false,
                      chatBorder: true, chatHeader: false, bjInfoBar: true, playerBorder: false, pinnedMsg: true,
                    }))} />
                  </div>
                </div>

                {/* 리셋 */}
                <button onClick={() => setSettings({ ...DEFAULT, enabled: true, goldTone: settings.goldTone })}
                  className="w-full py-1.5 rounded text-[10px] font-bold text-white/40 hover:text-white/70"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  초기화
                </button>
                <p className="text-[9px] text-white/20 text-center">미리보기 전용 · 새로고침 시 초기화</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ToggleRow({ label, checked, onChange, bold }: { label: string; checked: boolean; onChange: () => void; bold?: boolean }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-0.5">
      <span className={`text-[11px] ${bold ? "font-bold text-white" : "text-white/70"}`}>{label}</span>
      <div className="relative" onClick={e => { e.preventDefault(); onChange(); }}>
        <div className="w-8 h-4 rounded-full transition-colors" style={{ background: checked ? "rgb(212,175,55)" : "rgba(255,255,255,0.12)" }}>
          <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform" style={{ left: checked ? 18 : 2 }} />
        </div>
      </div>
    </label>
  );
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="py-1.5 rounded text-[10px] font-bold text-amber-300/70 hover:text-amber-300 transition-colors"
      style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
      {label}
    </button>
  );
}

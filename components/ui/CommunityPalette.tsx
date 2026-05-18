"use client";

import { useEffect, useState, useRef, useCallback } from "react";

// 회색 보조 텍스트 색상 후보
const TEXT_PRESETS = [
  { name: "기본 진회색",   val: "75,85,99" },
  { name: "기존 회색",     val: "107,114,128" },
  { name: "진한 회색",     val: "55,65,81" },
  { name: "짙은 검정",     val: "30,41,59" },
  { name: "쿨다크",        val: "51,65,85" },
  { name: "웜다크",        val: "68,64,60" },
  { name: "브랜드 톤",     val: "12,74,110" },
  { name: "밝은 회색",     val: "148,163,184" },
];

// 폰트 옵션 — emoji fallback 포함 (한글 폰트엔 emoji 글리프가 없어 박스로 보이므로)
const EMOJI_FB = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla'";
const FONTS = [
  { name: "Spoqa Han Sans", family: `'Spoqa Han Sans Neo','Spoqa Han Sans','Noto Sans KR',${EMOJI_FB},sans-serif`, url: "" },
  { name: "Noto Sans KR",   family: `'Noto Sans KR',${EMOJI_FB},sans-serif`, url: "" },
  { name: "Pretendard",     family: `'Pretendard',${EMOJI_FB},sans-serif`, url: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" },
  { name: "IBM Plex Sans",  family: `'IBM Plex Sans KR',${EMOJI_FB},sans-serif`, url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap" },
  { name: "나눔고딕",       family: `'Nanum Gothic',${EMOJI_FB},sans-serif`, url: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap" },
  { name: "나눔스퀘어",     family: `'NanumSquare',${EMOJI_FB},sans-serif`, url: "https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css" },
  { name: "맑은 고딕",      family: `'Malgun Gothic','맑은 고딕',${EMOJI_FB},sans-serif`, url: "" },
  { name: "Gothic A1",      family: `'Gothic A1',${EMOJI_FB},sans-serif`, url: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@300;400;500;600;700&display=swap" },
];

const loadedFonts = new Set<string>();
function loadFont(font: typeof FONTS[0]) {
  if (typeof document === "undefined" || !font.url || loadedFonts.has(font.name)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.url;
  document.head.appendChild(link);
  loadedFonts.add(font.name);
}

// localStorage 키
const K = {
  textColor: "livetv_palette_text_color",
  contentScale: "livetv_palette_content_scale",
  contentWeight: "livetv_palette_content_weight",
  sidebarScale: "livetv_palette_sidebar_scale",
  sidebarWeight: "livetv_palette_sidebar_weight",
  navScale: "livetv_palette_nav_scale",
  navWeight: "livetv_palette_nav_weight",
  // 폰트 — 4슬롯 (각각 family/name 저장)
  fontFamily: "livetv_palette_font_family",       // 전역 기본
  fontName: "livetv_palette_font_name",
  fontHeadingFamily: "livetv_palette_font_heading_family",   // 제목
  fontHeadingName: "livetv_palette_font_heading_name",
  fontBodyFamily: "livetv_palette_font_body_family",         // 본문
  fontBodyName: "livetv_palette_font_body_name",
  fontMetaFamily: "livetv_palette_font_meta_family",         // 메타(보조)
  fontMetaName: "livetv_palette_font_meta_name",
};

// 페이지 진입 시 즉시 적용 (깜빡임 방지)
export function applyCommunityPaletteFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const root = document.documentElement;
    const set = (cssVar: string, key: string) => {
      const v = localStorage.getItem(key);
      if (v) root.style.setProperty(cssVar, v);
    };
    const tc = localStorage.getItem(K.textColor);
    if (tc) root.style.setProperty("--text-secondary", tc.startsWith("rgb") ? tc : `rgb(${tc})`);
    set("--content-scale", K.contentScale);
    set("--content-weight", K.contentWeight);
    set("--sidebar-scale", K.sidebarScale);
    set("--sidebar-weight", K.sidebarWeight);
    set("--nav-scale", K.navScale);
    set("--nav-weight", K.navWeight);

    // 4개 폰트 슬롯 + 외부 폰트 url 로드
    const loadByName = (name: string | null) => {
      if (!name) return;
      const font = FONTS.find(f => f.name === name);
      if (font) loadFont(font);
    };
    set("--font-family", K.fontFamily);
    set("--font-heading", K.fontHeadingFamily);
    set("--font-body", K.fontBodyFamily);
    set("--font-meta", K.fontMetaFamily);
    loadByName(localStorage.getItem(K.fontName));
    loadByName(localStorage.getItem(K.fontHeadingName));
    loadByName(localStorage.getItem(K.fontBodyName));
    loadByName(localStorage.getItem(K.fontMetaName));
  } catch {}
}

type Tab = "content" | "sidebar" | "nav" | "font";

interface SectionConfig {
  scaleKey: string;
  weightKey: string;
  scaleVar: string;
  weightVar: string;
  defaultScale: number;
  defaultWeight: number;
}
const SECTIONS: Record<Exclude<Tab, "font">, SectionConfig> = {
  content: { scaleKey: K.contentScale, weightKey: K.contentWeight, scaleVar: "--content-scale", weightVar: "--content-weight", defaultScale: 1, defaultWeight: 500 },
  sidebar: { scaleKey: K.sidebarScale, weightKey: K.sidebarWeight, scaleVar: "--sidebar-scale", weightVar: "--sidebar-weight", defaultScale: 1, defaultWeight: 500 },
  nav:     { scaleKey: K.navScale,     weightKey: K.navWeight,     scaleVar: "--nav-scale",     weightVar: "--nav-weight",     defaultScale: 1, defaultWeight: 600 },
};
const SECTION_LABEL: Record<Exclude<Tab, "font">, string> = { content: "본문", sidebar: "사이드", nav: "헤더/네비" };

export default function CommunityPalette() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("content");

  // 각 섹션의 scale/weight state (localStorage 와 동기화)
  const [vals, setVals] = useState({
    content: { scale: 1, weight: 500 },
    sidebar: { scale: 1, weight: 500 },
    nav:     { scale: 1, weight: 600 },
  });
  const [textColor, setTextColor] = useState("75,85,99");
  const [customHex, setCustomHex] = useState("");
  // 4개 폰트 슬롯
  const [fontNames, setFontNames] = useState({ global: FONTS[0].name, heading: FONTS[0].name, body: FONTS[0].name, meta: FONTS[0].name });
  const [fontSlot, setFontSlot] = useState<"global" | "heading" | "body" | "meta">("global");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  // 초기 로드
  useEffect(() => {
    try {
      const next = { ...vals };
      (Object.keys(SECTIONS) as (keyof typeof SECTIONS)[]).forEach(k => {
        const cfg = SECTIONS[k];
        const s = parseFloat(localStorage.getItem(cfg.scaleKey) || String(cfg.defaultScale));
        const w = parseInt(localStorage.getItem(cfg.weightKey) || String(cfg.defaultWeight));
        if (!Number.isNaN(s)) next[k].scale = s;
        if (!Number.isNaN(w)) next[k].weight = w;
      });
      setVals(next);
      const tc = localStorage.getItem(K.textColor);
      if (tc) setTextColor(tc);
      setFontNames({
        global:  localStorage.getItem(K.fontName)        || FONTS[0].name,
        heading: localStorage.getItem(K.fontHeadingName) || FONTS[0].name,
        body:    localStorage.getItem(K.fontBodyName)    || FONTS[0].name,
        meta:    localStorage.getItem(K.fontMetaName)    || FONTS[0].name,
      });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateScale = (section: Exclude<Tab, "font">, s: number) => {
    const cfg = SECTIONS[section];
    localStorage.setItem(cfg.scaleKey, String(s));
    document.documentElement.style.setProperty(cfg.scaleVar, String(s));
    setVals(v => ({ ...v, [section]: { ...v[section], scale: s } }));
  };
  const updateWeight = (section: Exclude<Tab, "font">, w: number) => {
    const cfg = SECTIONS[section];
    localStorage.setItem(cfg.weightKey, String(w));
    document.documentElement.style.setProperty(cfg.weightVar, String(w));
    setVals(v => ({ ...v, [section]: { ...v[section], weight: w } }));
  };
  const updateColor = (val: string) => {
    setTextColor(val);
    setCustomHex("");
    localStorage.setItem(K.textColor, val);
    document.documentElement.style.setProperty("--text-secondary", `rgb(${val})`);
  };
  const FONT_SLOT_META: Record<typeof fontSlot, { cssVar: string; familyKey: string; nameKey: string; label: string }> = {
    global:  { cssVar: "--font-family",  familyKey: K.fontFamily,        nameKey: K.fontName,        label: "전역 기본" },
    heading: { cssVar: "--font-heading", familyKey: K.fontHeadingFamily, nameKey: K.fontHeadingName, label: "제목" },
    body:    { cssVar: "--font-body",    familyKey: K.fontBodyFamily,    nameKey: K.fontBodyName,    label: "본문" },
    meta:    { cssVar: "--font-meta",    familyKey: K.fontMetaFamily,    nameKey: K.fontMetaName,    label: "메타(보조)" },
  };
  const updateFont = (slot: typeof fontSlot, f: typeof FONTS[0]) => {
    loadFont(f);
    const meta = FONT_SLOT_META[slot];
    setFontNames(prev => ({ ...prev, [slot]: f.name }));
    localStorage.setItem(meta.familyKey, f.family);
    localStorage.setItem(meta.nameKey, f.name);
    document.documentElement.style.setProperty(meta.cssVar, f.family);
  };

  const reset = () => {
    Object.values(K).forEach(k => localStorage.removeItem(k));
    const root = document.documentElement;
    ["--text-secondary", "--content-scale", "--content-weight", "--sidebar-scale", "--sidebar-weight", "--nav-scale", "--nav-weight", "--font-family", "--font-heading", "--font-body", "--font-meta"].forEach(v => root.style.removeProperty(v));
    setVals({ content: { scale: 1, weight: 500 }, sidebar: { scale: 1, weight: 500 }, nav: { scale: 1, weight: 600 } });
    setTextColor("75,85,99");
    setFontNames({ global: FONTS[0].name, heading: FONTS[0].name, body: FONTS[0].name, meta: FONTS[0].name });
    setCustomHex("");
  };

  // 스펙트럼 canvas (보조 텍스트 색상 선택용)
  const drawSpectrum = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const hue = (x / w) * 360;
        const light = 15 + (1 - y / h) * 50;
        const s = 0.7, l = light / 100;
        const k = (n: number) => (n + hue / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const r = Math.round(f(0) * 255), g = Math.round(f(8) * 255), b = Math.round(f(4) * 255);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, []);
  const handleCanvasRef = useCallback((el: HTMLCanvasElement | null) => {
    if (!el) return;
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    drawSpectrum(el);
  }, [drawSpectrum]);
  const pickFromCanvas = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = Math.round((clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((clientY - rect.top) * (canvas.height / rect.height));
    const pixel = ctx.getImageData(Math.max(0, Math.min(x, canvas.width - 1)), Math.max(0, Math.min(y, canvas.height - 1)), 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    setCustomHex(`#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`);
    updateColor(`${r},${g},${b}`);
  };

  const tabStyle = (t: Tab) => ({
    color: tab === t ? "var(--brand)" : "var(--text-secondary)",
    borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
  });

  const renderSectionTab = (section: Exclude<Tab, "font">) => {
    const cur = vals[section];
    return (
      <>
        <p className="text-[10px] font-semibold flex items-center justify-between" style={{ color: "var(--text-primary)" }}>
          <span>{SECTION_LABEL[section]} 크기</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--brand)" }}>×{cur.scale.toFixed(2)}</span>
        </p>
        <input type="range" min="0.8" max="1.4" step="0.05" value={cur.scale}
          onChange={e => updateScale(section, parseFloat(e.target.value))}
          className="w-full" />
        <div className="flex justify-between text-[9px]" style={{ color: "var(--text-secondary)" }}>
          <span>작게</span><span>기본</span><span>크게</span>
        </div>

        <p className="text-[10px] font-semibold mt-2 flex items-center justify-between" style={{ color: "var(--text-primary)" }}>
          <span>{SECTION_LABEL[section]} 굵기</span>
          <span className="font-mono text-[10px]" style={{ color: "var(--brand)" }}>{cur.weight}</span>
        </p>
        <div className="grid grid-cols-4 gap-1">
          {[400, 500, 600, 700].map(w => (
            <button key={w}
              onClick={() => updateWeight(section, w)}
              className="py-1.5 rounded-lg text-[10px] transition-all"
              style={{
                fontWeight: w,
                background: cur.weight === w ? "var(--brand-light)" : "transparent",
                border: cur.weight === w ? "2px solid var(--brand)" : "1px solid var(--border)",
                color: cur.weight === w ? "var(--brand)" : "var(--text-primary)",
              }}
            >{w}</button>
          ))}
        </div>

        {/* 본문 탭에만 보조 색상 노출 (전역 영향) */}
        {section === "content" && (
          <>
            <div className="h-px my-2" style={{ background: "var(--border)" }} />
            <p className="text-[10px] font-semibold" style={{ color: "var(--text-primary)" }}>보조 텍스트 색상 (전역)</p>
            <div className="grid grid-cols-2 gap-1">
              {TEXT_PRESETS.map(c => (
                <button key={c.name}
                  onClick={() => updateColor(c.val)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: textColor === c.val ? "var(--brand-light)" : "transparent",
                    border: textColor === c.val ? "2px solid var(--brand)" : "1px solid var(--border)",
                    color: `rgb(${c.val})`,
                  }}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `rgb(${c.val})` }} />
                  {c.name}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>
              자유 색상
              {customHex && <span className="ml-1.5 font-mono text-[9px] px-1 rounded" style={{ background: "var(--bg)", color: "var(--brand)" }}>{customHex}</span>}
            </p>
            <canvas ref={handleCanvasRef} width={234} height={60}
              className="w-full rounded-lg cursor-crosshair touch-none"
              style={{ height: 60, border: "1px solid var(--border)" }}
              onMouseDown={(e) => { dragging.current = true; pickFromCanvas(e); }}
              onMouseMove={(e) => { if (dragging.current) pickFromCanvas(e); }}
              onMouseUp={() => { dragging.current = false; }}
              onMouseLeave={() => { dragging.current = false; }}
              onTouchStart={(e) => { dragging.current = true; pickFromCanvas(e); }}
              onTouchMove={(e) => { if (dragging.current) pickFromCanvas(e); }}
              onTouchEnd={() => { dragging.current = false; }}
            />
          </>
        )}
      </>
    );
  };

  return (
    <div className="fixed bottom-24 right-4 z-[9998]">
      <button
        onClick={() => setOpen(v => !v)}
        title="가독성 파레트 (관리자)"
        className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white text-base"
        style={{ background: "var(--brand)" }}
      >🎨</button>

      {open && (
        <div className="absolute bottom-12 right-0 w-[280px] rounded-xl shadow-xl flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>가독성 파레트</span>
            <button onClick={() => setOpen(false)} className="text-[12px]" style={{ color: "var(--text-secondary)" }}>✕</button>
          </div>

          {/* 탭 */}
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {(["content", "sidebar", "nav", "font"] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 text-center py-2 text-[11px] font-bold transition-colors"
                style={tabStyle(t)}>
                {t === "content" ? "본문" : t === "sidebar" ? "사이드" : t === "nav" ? "네비" : "폰트"}
              </button>
            ))}
          </div>

          <div className="p-3 flex flex-col gap-1.5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {tab !== "font" && renderSectionTab(tab)}

            {tab === "font" && (
              <>
                {/* 슬롯 선택 */}
                <p className="text-[10px] font-semibold" style={{ color: "var(--text-primary)" }}>요소별 폰트 슬롯</p>
                <div className="grid grid-cols-4 gap-1">
                  {(["global", "heading", "body", "meta"] as const).map(slot => (
                    <button key={slot}
                      onClick={() => setFontSlot(slot)}
                      className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                      style={{
                        background: fontSlot === slot ? "var(--brand-light)" : "transparent",
                        border: fontSlot === slot ? "2px solid var(--brand)" : "1px solid var(--border)",
                        color: fontSlot === slot ? "var(--brand)" : "var(--text-primary)",
                      }}>
                      {FONT_SLOT_META[slot].label}
                    </button>
                  ))}
                </div>
                <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
                  {fontSlot === "global"
                    ? "* 다른 슬롯이 비어 있을 때 사용되는 기본 폰트"
                    : fontSlot === "heading"
                      ? "* h1~h4, .text-lg/xl/2xl, 16px+ 요소"
                      : fontSlot === "body"
                        ? "* p/li/td, .text-base/sm, 13~15px 요소"
                        : "* .text-xs, 8~12px 작은 보조 텍스트"}
                </p>

                <p className="text-[10px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>{FONT_SLOT_META[fontSlot].label} 폰트</p>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {FONTS.map(f => (
                    <button key={f.name}
                      onClick={() => updateFont(fontSlot, f)}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] transition-all text-left shrink-0"
                      style={{
                        fontFamily: f.family,
                        background: fontNames[fontSlot] === f.name ? "var(--brand-light)" : "transparent",
                        border: fontNames[fontSlot] === f.name ? "2px solid var(--brand)" : "1px solid var(--border)",
                        color: fontNames[fontSlot] === f.name ? "var(--brand)" : "var(--text-primary)",
                      }}>
                      <span className="font-semibold">{f.name}</span>
                      <span className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: f.family }}>가나다 ABC</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 미리보기 */}
            <div className="mt-2 p-2 rounded-lg text-[12px]" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <div style={{ color: "var(--text-primary)" }}>제목 미리보기</div>
              <div className="mt-0.5" style={{ color: "var(--text-secondary)" }}>보조 텍스트는 이렇게 보입니다.</div>
            </div>

            <button onClick={reset}
              className="mt-1 py-1.5 rounded-lg text-[10px] font-bold"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              모든 값 초기화
            </button>
            <p className="text-[9px] mt-1" style={{ color: "var(--text-secondary)" }}>
              * 본인 브라우저에만 저장됩니다. 전 사이트 일괄 적용은 별도 요청 필요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

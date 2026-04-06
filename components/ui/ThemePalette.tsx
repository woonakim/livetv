"use client";

import { useState, useRef, useCallback } from "react";

const FONTS = [
  { name: "Noto Sans KR", family: "'Noto Sans KR', sans-serif", url: "" },
  { name: "Pretendard", family: "'Pretendard', sans-serif", url: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" },
  { name: "IBM Plex Sans KR", family: "'IBM Plex Sans KR', sans-serif", url: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap" },
  { name: "Spoqa Han Sans", family: "'Spoqa Han Sans Neo', sans-serif", url: "https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css" },
  { name: "나눔고딕", family: "'Nanum Gothic', sans-serif", url: "https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap" },
  { name: "나눔스퀘어", family: "'NanumSquare', sans-serif", url: "https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css" },
  { name: "맑은 고딕", family: "'Malgun Gothic', '맑은 고딕', sans-serif", url: "" },
  { name: "Gothic A1", family: "'Gothic A1', sans-serif", url: "https://fonts.googleapis.com/css2?family=Gothic+A1:wght@300;400;500;600;700&display=swap" },
];

const loadedFonts = new Set<string>();

function loadFont(font: typeof FONTS[0]) {
  if (!font.url || loadedFonts.has(font.name)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = font.url;
  document.head.appendChild(link);
  loadedFonts.add(font.name);
}

const BRAND_COLORS = [
  { name: "스카이블루", val: "14,165,233" },
  { name: "오렌지", val: "255,140,0" },
  { name: "레드", val: "220,38,38" },
  { name: "퍼플", val: "124,58,237" },
  { name: "그린", val: "22,163,74" },
  { name: "핑크", val: "219,39,119" },
  { name: "골드", val: "180,130,20" },
  { name: "다크네이비", val: "30,64,115" },
  { name: "틸", val: "13,148,136" },
  { name: "슬레이트", val: "71,85,105" },
];

const BG_COLORS = [
  { name: "화이트", bg: "255,255,255", surface: "255,255,255", text: "10,10,10", textSub: "107,114,128" },
  { name: "아이보리", bg: "252,250,245", surface: "255,255,252", text: "10,10,10", textSub: "107,114,128" },
  { name: "라이트그레이", bg: "245,245,245", surface: "255,255,255", text: "10,10,10", textSub: "107,114,128" },
  { name: "쿨그레이", bg: "241,245,249", surface: "248,250,252", text: "15,23,42", textSub: "100,116,139" },
  { name: "다크", bg: "17,24,39", surface: "31,41,55", text: "243,244,246", textSub: "156,163,175" },
  { name: "네이비", bg: "15,23,42", surface: "30,41,59", text: "226,232,240", textSub: "148,163,184" },
  { name: "차콜", bg: "24,24,27", surface: "39,39,42", text: "244,244,245", textSub: "161,161,170" },
  { name: "미드나잇", bg: "3,7,18", surface: "17,24,39", text: "209,213,219", textSub: "107,114,128" },
];

function applyBrand(val: string) {
  const root = document.documentElement;
  root.style.setProperty("--brand", `rgb(${val})`);
  root.style.setProperty("--brand-light", `rgba(${val},0.1)`);
  // border를 brand 기반 연한색으로
  const [r, g, b] = val.split(",").map(Number);
  const brR = Math.round(r * 0.4 + 255 * 0.6);
  const brG = Math.round(g * 0.4 + 255 * 0.6);
  const brB = Math.round(b * 0.4 + 255 * 0.6);
  root.style.setProperty("--border", `rgb(${brR},${brG},${brB})`);
}

function applyBg(t: typeof BG_COLORS[0]) {
  const root = document.documentElement;
  root.style.setProperty("--bg", `rgb(${t.bg})`);
  root.style.setProperty("--surface", `rgb(${t.surface})`);
  root.style.setProperty("--text-primary", `rgb(${t.text})`);
  root.style.setProperty("--text-secondary", `rgb(${t.textSub})`);
  // 교차 행 배경색: 다크면 surface보다 약간 밝게, 라이트면 약간 어둡게
  const isDark = t.bg.split(",").map(Number).some(v => v < 50);
  const [sR, sG, sB] = t.surface.split(",").map(Number);
  if (isDark) {
    root.style.setProperty("--surface-alt", `rgb(${Math.min(sR + 12, 255)},${Math.min(sG + 12, 255)},${Math.min(sB + 12, 255)})`);
  } else {
    root.style.setProperty("--surface-alt", `rgb(${Math.max(sR - 10, 0)},${Math.max(sG - 10, 0)},${Math.max(sB - 10, 0)})`);
  }
}

function applySpectrumColor(r: number, g: number, b: number) {
  const root = document.documentElement;
  root.style.setProperty("--brand", `rgb(${r},${g},${b})`);
  root.style.setProperty("--brand-light", `rgba(${r},${g},${b},0.1)`);
  const brR = Math.round(r * 0.4 + 255 * 0.6);
  const brG = Math.round(g * 0.4 + 255 * 0.6);
  const brB = Math.round(b * 0.4 + 255 * 0.6);
  root.style.setProperty("--border", `rgb(${brR},${brG},${brB})`);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

const LOGO_OPTIONS = [
  { id: "0", name: "텍스트로고" },
  { id: "1", name: "로고1" },
  { id: "2", name: "로고2" },
  { id: "3", name: "로고3" },
];

const ICON_OPTIONS = [
  { id: "0", name: "텍스트메뉴" },
  { id: "1", name: "메뉴1" },
  { id: "2", name: "메뉴2" },
  { id: "3", name: "메뉴3" },
];

type Tab = "brand" | "bg";

export default function ThemePalette() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("brand");
  const [activeBrand, setActiveBrand] = useState(BRAND_COLORS[0].name);
  const [activeBg, setActiveBg] = useState(BG_COLORS[0].name);
  const [activeFont, setActiveFont] = useState(FONTS[0].name);
  const [customHex, setCustomHex] = useState("");
  const [activeLogo, setActiveLogo] = useState("1");
  const [activeIcon, setActiveIcon] = useState("1");
  const [lang, setLang] = useState<"korean" | "english">("korean");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  // 드래그 이동 (모바일)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const btnRef = useRef<HTMLDivElement>(null);

  const startDrag = (clientX: number, clientY: number) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      startX: clientX,
      startY: clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    };
  };

  const moveDrag = (clientX: number, clientY: number, preventDefault?: () => void) => {
    if (!dragState.current) return;
    const dx = clientX - dragState.current.startX;
    const dy = clientY - dragState.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragState.current.moved = true;
    if (!dragState.current.moved) return;
    preventDefault?.();
    const newX = Math.max(0, Math.min(window.innerWidth - 48, dragState.current.origX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 48, dragState.current.origY + dy));
    setPos({ x: newX, y: newY });
  };

  const endDrag = () => {
    if (dragState.current?.moved) {
      dragState.current = null;
      return;
    }
    dragState.current = null;
  };

  // 모바일 터치
  const handleTouchStart = (e: React.TouchEvent) => startDrag(e.touches[0].clientX, e.touches[0].clientY);
  const handleTouchMove = (e: React.TouchEvent) => moveDrag(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault());
  const handleTouchEnd = () => endDrag();

  // PC 마우스
  const handleMouseDown = (e: React.MouseEvent) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
  const handleMouseMove = useCallback((e: MouseEvent) => moveDrag(e.clientX, e.clientY), []);
  const handleMouseUp = useCallback(() => { endDrag(); window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); }, [handleMouseMove]);

  const onBtnMouseDown = (e: React.MouseEvent) => {
    handleMouseDown(e);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const drawSpectrum = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const hue = (x / w) * 360;
        const light = 15 + (1 - y / h) * 50;
        const [r, g, b] = hslToRgb(hue, 85, light);
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
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = Math.round((clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((clientY - rect.top) * (canvas.height / rect.height));
    const pixel = ctx.getImageData(Math.max(0, Math.min(x, canvas.width - 1)), Math.max(0, Math.min(y, canvas.height - 1)), 1, 1).data;
    const [r, g, b] = [pixel[0], pixel[1], pixel[2]];
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    setCustomHex(hex);
    if (tab === "bg") {
      // 배경 색상으로 적용
      const root = document.documentElement;
      root.style.setProperty("--bg", `rgb(${r},${g},${b})`);
      // surface: 약간 밝게
      const sR = Math.min(255, r + 15);
      const sG = Math.min(255, g + 15);
      const sB = Math.min(255, b + 15);
      root.style.setProperty("--surface", `rgb(${sR},${sG},${sB})`);
      // 밝기에 따라 텍스트 색상 자동 조정
      const lum = (r * 299 + g * 587 + b * 114) / 1000;
      if (lum < 128) {
        root.style.setProperty("--text-primary", "rgb(243,244,246)");
        root.style.setProperty("--text-secondary", "rgb(156,163,175)");
      } else {
        root.style.setProperty("--text-primary", "rgb(10,10,10)");
        root.style.setProperty("--text-secondary", "rgb(107,114,128)");
      }
      setActiveBg("");
    } else {
      applySpectrumColor(r, g, b);
      setActiveBrand("");
    }
  };

  const tabStyle = (t: Tab) => ({
    color: tab === t ? "var(--brand)" : "var(--text-secondary)",
    borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
  });

  return (
    <div
      ref={btnRef}
      className={pos ? "fixed z-[9999]" : "fixed bottom-20 left-4 z-[9999] sm:bottom-6 sm:left-auto sm:right-4"}
      style={pos ? { left: pos.x, top: pos.y } : undefined}
    >
      <button
        onClick={() => { if (!dragState.current?.moved) setOpen(v => !v); }}
        onMouseDown={onBtnMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white text-lg touch-none"
        style={{ background: "var(--brand)" }}
      >
        🎨
      </button>

      {open && (
        <div
          className="absolute bottom-12 left-0 sm:left-auto sm:right-0 w-[260px] rounded-xl shadow-xl flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          {/* 탭 헤더 */}
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            <button
              onClick={() => setTab("brand")}
              className="flex-1 text-center py-2 text-[12px] font-bold transition-colors"
              style={tabStyle("brand")}
            >
              🎨 사이트 색상
            </button>
            <button
              onClick={() => setTab("bg")}
              className="flex-1 text-center py-2 text-[12px] font-bold transition-colors"
              style={tabStyle("bg")}
            >
              🖼 배경 색상
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-3 flex flex-col gap-2 max-h-[85vh] overflow-y-auto custom-scrollbar">

            {/* 탭별 고유 영역 */}
            {tab === "brand" && (
              <>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>테마 색상</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BRAND_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => { applyBrand(c.val); setActiveBrand(c.name); setCustomHex(""); }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: activeBrand === c.name ? `rgba(${c.val},0.15)` : "transparent",
                        border: activeBrand === c.name ? `2px solid rgb(${c.val})` : "1px solid #e2e8f0",
                        color: `rgb(${c.val})`,
                      }}
                    >
                      <span className="w-4 h-4 rounded-full shrink-0" style={{ background: `rgb(${c.val})` }} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}

            {tab === "bg" && (
              <>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>배경 테마</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {BG_COLORS.map(bg => (
                    <button
                      key={bg.name}
                      onClick={() => { applyBg(bg); setActiveBg(bg.name); }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                      style={{
                        background: activeBg === bg.name ? "var(--brand-light)" : "transparent",
                        border: activeBg === bg.name ? "2px solid var(--brand)" : "1px solid #e2e8f0",
                        color: activeBg === bg.name ? "var(--brand)" : "var(--text-primary)",
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded shrink-0 flex items-center justify-center"
                        style={{ background: `rgb(${bg.bg})`, border: "1px solid #d4d4d4" }}
                      >
                        <div className="w-3 h-2.5 rounded-sm" style={{ background: `rgb(${bg.surface})`, border: "1px solid rgba(0,0,0,0.1)" }} />
                      </div>
                      <div className="flex flex-col items-start leading-tight">
                        <span>{bg.name}</span>
                        <span className="text-[8px] font-normal" style={{ color: "var(--text-secondary)" }}>
                          {bg.bg.split(",").some(v => Number(v) < 50) ? "다크" : "라이트"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 로고 선택 */}
            <div className="h-px my-1" style={{ background: "var(--border)" }} />
            <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>로고</p>
            <div className="grid grid-cols-4 gap-1">
              {LOGO_OPTIONS.map(l => (
                <button
                  key={l.id}
                  onClick={() => {
                    setActiveLogo(l.id);
                    document.documentElement.setAttribute("data-logo-id", l.id);
                  }}
                  className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: activeLogo === l.id ? "var(--brand-light)" : "transparent",
                    border: activeLogo === l.id ? "2px solid var(--brand)" : "1px solid #e2e8f0",
                    color: activeLogo === l.id ? "var(--brand)" : "var(--text-primary)",
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>

            {/* 언어 선택 */}
            <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>로고 언어</p>
            <div className="grid grid-cols-2 gap-1">
              {(["korean", "english"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => {
                    setLang(l);
                    document.documentElement.setAttribute("data-logo-lang", l);
                  }}
                  className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: lang === l ? "var(--brand-light)" : "transparent",
                    border: lang === l ? "2px solid var(--brand)" : "1px solid #e2e8f0",
                    color: lang === l ? "var(--brand)" : "var(--text-primary)",
                  }}
                >
                  {l === "korean" ? "한글" : "English"}
                </button>
              ))}
            </div>

            {/* 아이콘 선택 */}
            <p className="text-[11px] font-semibold mt-1" style={{ color: "var(--text-primary)" }}>메뉴 아이콘</p>
            <div className="flex gap-1">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic.id}
                  onClick={() => {
                    setActiveIcon(ic.id);
                    document.documentElement.setAttribute("data-icon-id", ic.id);
                  }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap"
                  style={{
                    background: activeIcon === ic.id ? "var(--brand-light)" : "transparent",
                    border: activeIcon === ic.id ? "2px solid var(--brand)" : "1px solid #e2e8f0",
                    color: activeIcon === ic.id ? "var(--brand)" : "var(--text-primary)",
                  }}
                >
                  {ic.name}
                </button>
              ))}
            </div>

            {/* 아이콘 크기 조절 */}
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => {
                  const cur = parseInt(document.documentElement.getAttribute("data-icon-size") || "96");
                  const next = Math.max(32, cur - 16);
                  document.documentElement.setAttribute("data-icon-size", String(next));
                }}
                className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ border: "1px solid #e2e8f0", color: "var(--text-primary)" }}
              >
                아이콘 작게 ▼
              </button>
              <button
                onClick={() => {
                  const cur = parseInt(document.documentElement.getAttribute("data-icon-size") || "96");
                  const next = Math.min(160, cur + 16);
                  document.documentElement.setAttribute("data-icon-size", String(next));
                }}
                className="py-1.5 rounded-lg text-[10px] font-bold transition-all"
                style={{ border: "1px solid #e2e8f0", color: "var(--text-primary)" }}
              >
                아이콘 크게 ▲
              </button>
            </div>

            {/* 미리보기 */}
            <div className="flex items-center gap-2 p-2 rounded-lg flex-wrap" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              {activeLogo === "0" ? (
                <div className="font-black text-sm px-2 py-1 rounded" style={{ background: "var(--brand)", color: "#fff" }}>
                  LIVE<span style={{ color: "#000" }}>TV</span>
                </div>
              ) : (
                <img src={`/live_logo/${activeLogo}_${lang}.png`} alt="로고" className="h-8 object-contain" />
              )}
              {activeIcon !== "0" && (
                <div className="flex gap-1">
                  <img src={`/live_logo/${activeIcon}_spon.png`} alt="" className="h-6 object-contain" />
                  <img src={`/live_logo/${activeIcon}_broad.png`} alt="" className="h-6 object-contain" />
                  <img src={`/live_logo/${activeIcon}_anal.png`} alt="" className="h-6 object-contain" />
                </div>
              )}
            </div>

            {/* 공통: 글꼴 */}
            <div className="h-px my-1" style={{ background: "var(--border)" }} />
            <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>글꼴 선택</p>
            <div className="flex flex-col gap-1 max-h-[148px] overflow-y-auto custom-scrollbar">
              {FONTS.map(f => (
                <button
                  key={f.name}
                  onClick={() => { loadFont(f); document.body.style.fontFamily = f.family; setActiveFont(f.name); }}
                  className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[12px] transition-all text-left shrink-0"
                  style={{
                    fontFamily: f.family,
                    background: activeFont === f.name ? "var(--brand-light)" : "transparent",
                    border: activeFont === f.name ? "2px solid var(--brand)" : "1px solid #e2e8f0",
                    color: activeFont === f.name ? "var(--brand)" : "var(--text-primary)",
                    minHeight: 36,
                  }}
                >
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: f.family }}>가나다 ABC</span>
                </button>
              ))}
            </div>

            {/* 공통: 스펙트럼 */}
            <div className="h-px my-1" style={{ background: "var(--border)" }} />
            <p className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
              자유 색상 선택
              {customHex && (
                <span className="ml-1.5 font-mono text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--bg)", color: "var(--brand)" }}>
                  {customHex}
                </span>
              )}
            </p>
            <canvas
              ref={handleCanvasRef}
              width={234}
              height={80}
              className="w-full rounded-lg cursor-crosshair touch-none"
              style={{ height: 80, border: "1px solid var(--border)" }}
              onMouseDown={(e) => { dragging.current = true; pickFromCanvas(e); }}
              onMouseMove={(e) => { if (dragging.current) pickFromCanvas(e); }}
              onMouseUp={() => { dragging.current = false; }}
              onMouseLeave={() => { dragging.current = false; }}
              onTouchStart={(e) => { e.stopPropagation(); dragging.current = true; pickFromCanvas(e); }}
              onTouchMove={(e) => { e.stopPropagation(); if (dragging.current) pickFromCanvas(e); }}
              onTouchEnd={(e) => { e.stopPropagation(); dragging.current = false; }}
            />

          </div>

          <div className="px-3 pb-2">
            <p className="text-[9px]" style={{ color: "var(--text-secondary)" }}>
              * 임시 미리보기. 새로고침 시 초기화.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

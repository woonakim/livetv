"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import AuthModal from "@/components/ui/AuthModal";
import FloatingPanel from "./FloatingPanel";
// import ThemePalette from "@/components/ui/ThemePalette";
import InstallPrompt from "@/components/ui/InstallPrompt";
import AccessTracker from "@/components/ui/AccessTracker";

const NAV_ICON_MAP: Record<string, string> = {
  "스폰업체": "spon",
  "스포츠 중계": "broad",
  "스포츠 분석": "anal",
};

const DESKTOP_NAV = [
  {
    label: "스폰업체",
    href: "/partners",
    svgIcon: "/svg_logo/icon-svg-01.svg",
  },
  {
    label: "라이브방송",
    href: "/live",
    badge: "LIVE",
    svgIcon: "/svg_logo/icon-svg-05.svg",
  },
  {
    label: "스포츠 중계",
    href: "/broadcast",
    badge: "LIVE",
    svgIcon: "/svg_logo/icon-svg-02.svg",
    sub: [
      { label: "라이브 중계", href: "/broadcast" },
      { label: "중계 일정",   href: "/broadcast" },
    ],
  },
  {
    label: "스포츠 분석",
    href: "/analysis/premium",
    svgIcon: "/svg_logo/icon-svg-04.svg",
    sub: [
      { label: "프리미엄분석", href: "/analysis/premium" },
      { label: "분석 포스트",   href: "/analysis" },
    ],
  },
  {
    label: "스포츠 정보",
    href: "/sports-info/standings",
    svgIcon: "/svg_logo/icon-svg-03.svg",
    sub: [
      { label: "스코어 정보", href: "/sports-info/standings" },
      { label: "스포츠 뉴스", href: "/sports-info" },
    ],
  },
  {
    label: "유튜브",
    href: "/youtube/highlights",
    svgIcon: "/svg_logo/icon-svg-09.svg",
  },
  {
    label: "이벤트",
    href: "/events",
    svgIcon: "/svg_logo/icon-svg-08.svg",
    sub: [
      { label: "이벤트매치", href: "/events" },
      { label: "출석체크",   href: "/attendance" },
    ],
  },
  {
    label: "포인트 전환",
    href: "/points",
    svgIcon: "/svg_logo/icon-svg-06.svg",
  },
  {
    label: "공지사항",
    href: "/notice",
    svgIcon: "/svg_logo/icon-svg-10.svg",
  },
];

const BOTTOM_NAV = [
  { icon: "fas fa-home",           label: "홈",    href: "/" },
  { icon: "fas fa-broadcast-tower", label: "라이브", href: "/live" },
  { icon: "fas fa-play-circle",    label: "중계",  href: "/broadcast" },
  { icon: "fas fa-chart-pie",      label: "분석",  href: "/analysis/premium" },
  { icon: "fa-brands fa-youtube",  label: "유튜브", href: "/youtube/highlights" },
  { icon: "fas fa-ellipsis-h",     label: "더보기", href: "__more__" },
];

const MORE_MENU = [
  { icon: "fas fa-handshake",      label: "제휴업체",   href: "/partners" },
  { icon: "fas fa-play-circle",    label: "스포츠 중계", href: "/broadcast" },
  { icon: "fas fa-chart-pie",      label: "스포츠 분석", href: "/analysis" },
  { icon: "fas fa-newspaper",      label: "스포츠 뉴스", href: "/sports-info" },
  { icon: "fas fa-trophy",         label: "팀 순위",    href: "/sports-info/standings" },
  { icon: "fa-brands fa-youtube",  label: "하이라이트",  href: "/youtube/highlights" },
  { icon: "fas fa-gift",           label: "이벤트",     href: "/events" },
  { icon: "fas fa-coins",          label: "포인트 전환", href: "/points" },
  { icon: "fas fa-calendar-check", label: "출석체크",   href: "/attendance" },
  { icon: "fas fa-bullhorn",       label: "공지사항",   href: "/notice" },
  { icon: "fas fa-broadcast-tower",label: "라이브 방송", href: "/live" },
  { icon: "fas fa-star",           label: "픽스터 분석", href: "/analysis/premium" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; nickname: string; role: string; points?: number; exp?: number; referredBy?: string | null } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [modal, setModal] = useState<"login" | "register" | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [, setLogoId] = useState("3");
  const [iconId, setIconId] = useState("0");
  const [, setLogoLang] = useState("korean");
  const [iconSize, setIconSize] = useState(96);
  const [isDark, setIsDark] = useState(false);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (isDark) {
      // 라이트 모드
      root.style.setProperty("--bg", "rgb(240,249,255)");
      root.style.setProperty("--surface", "rgb(255,255,255)");
      root.style.setProperty("--surface-alt", "#f4f4f4");
      root.style.setProperty("--text-primary", "rgb(10,10,10)");
      root.style.setProperty("--text-secondary", "rgb(107,114,128)");
      root.style.setProperty("--border", "rgb(186,230,253)");
    } else {
      // 다크 모드
      root.style.setProperty("--bg", "rgb(17,24,39)");
      root.style.setProperty("--surface", "rgb(31,41,55)");
      root.style.setProperty("--surface-alt", "rgb(43,53,67)");
      root.style.setProperty("--text-primary", "rgb(243,244,246)");
      root.style.setProperty("--text-secondary", "rgb(156,163,175)");
      root.style.setProperty("--border", "rgb(55,65,81)");
    }
    setIsDark(!isDark);
  };

  // data-logo-id / data-icon-id / data-logo-lang / data-icon-size 변경 감지
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setLogoId(document.documentElement.getAttribute("data-logo-id") || "1");
      setIconId(document.documentElement.getAttribute("data-icon-id") || "1");
      setLogoLang(document.documentElement.getAttribute("data-logo-lang") || "korean");
      setIconSize(parseInt(document.documentElement.getAttribute("data-icon-size") || "96"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-logo-id", "data-icon-id", "data-logo-lang", "data-icon-size"] });
    return () => observer.disconnect();
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  useEffect(() => { fetchUser(); }, [fetchUser]);

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)" }}>
      <InstallPrompt />
      <AccessTracker />

      {/* ── 모바일 상단 헤더 (lg 이상 숨김) ── */}
      <header
        className="lg:hidden w-full sticky top-0 z-50 flex items-center justify-between px-4"
        style={{ height: "56px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={isDark ? "/livetv_logo_dark.png" : "/real_logo/livetv_logo.png"} alt="LIVETV" className="h-16 object-contain" />
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleDarkMode} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--bg)", border: "1px solid var(--border)" }} title={isDark ? "라이트 모드" : "다크 모드"}>
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-primary)" }}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-primary)" }}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          {authReady && (user ? (
            <div className="flex items-center gap-1.5">
              <Link href="/mypage" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>
                마이
              </Link>
              <button onClick={handleLogout} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
                로그아웃
              </button>
            </div>
          ) : (
            <button onClick={() => setModal("login")} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
              로그인
            </button>
          ))}
        </div>
      </header>

      {/* ── 데스크탑 헤더 (모바일 숨김) ── */}
      <header
        className="hidden lg:flex w-full sticky top-0 z-50 items-center"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-full max-w-[1572px] mx-auto flex items-center px-4 gap-6 transition-all"
          style={{ height: iconId !== "0" ? `${iconSize + 20}px` : "90px" }}
        >

          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={isDark ? "/livetv_logo_dark.png" : "/real_logo/livetv_logo.png"} alt="LIVETV" className="h-20 object-contain" />
          </Link>

          {/* 텍스트 네비게이션 */}
          <nav className="flex items-center h-full flex-1">
            <ul className="flex items-center h-full m-0 list-none">
              {DESKTOP_NAV.map((item) => {
                const hasIcon = !!NAV_ICON_MAP[item.label];
                const isIconMode = iconId !== "0";
                // 아이콘 모드에서는 아이콘 메뉴만 표시
                if (isIconMode && !hasIcon) return null;
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li
                    key={item.href}
                    className="relative h-full group"
                    style={{ width: 100 }}
                    onMouseEnter={e => {
                      const link = e.currentTarget.querySelector(":scope > a") as HTMLElement;
                      if (!link) return;
                      link.style.background = "var(--brand)";
                      link.style.color = "#fff";
                      link.style.borderBottom = "2px solid var(--brand)";
                      link.style.borderRadius = "8px 8px 0 0";
                      const img = link.querySelector("img[src*='svg_logo']") as HTMLElement;
                      if (img) img.style.filter = "brightness(0) invert(1)";
                    }}
                    onMouseLeave={e => {
                      const link = e.currentTarget.querySelector(":scope > a") as HTMLElement;
                      if (!link) return;
                      link.style.background = "transparent";
                      link.style.color = isActive ? "var(--brand)" : "var(--text-primary)";
                      link.style.borderBottom = isActive ? "2px solid var(--brand)" : "2px solid transparent";
                      link.style.borderRadius = "0";
                      const img = link.querySelector("img[src*='svg_logo']") as HTMLElement;
                      if (img) img.style.filter = "none";
                    }}
                  >
                    <Link
                      href={item.href}
                      className="flex flex-col items-center justify-center gap-0 h-full w-full text-[14px] font-bold whitespace-nowrap transition-all"
                      style={{
                        color: isActive ? "var(--brand)" : "var(--text-primary)",
                        background: "transparent",
                        borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                      }}
                    >
                      {hasIcon && isIconMode ? (
                        <img
                          src={`/live_logo/${iconId}_${NAV_ICON_MAP[item.label]}.png`}
                          alt={item.label}
                          className="object-contain"
                          style={{ height: `${iconSize}px` }}
                        />
                      ) : item.svgIcon ? (
                        <span className="flex flex-col items-center gap-0.5">
                          <img src={item.svgIcon} alt="" className="w-[60px] h-[60px] object-contain" />
                          <span className="flex items-center gap-1 text-[11px]">
                            {item.label}
                            {item.badge && (
                              <span className="text-white text-[8px] font-black px-1 py-0.5 rounded-full" style={{ background: "#ef4444" }}>{item.badge}</span>
                            )}
                          </span>
                        </span>
                      ) : (
                        item.label
                      )}
                      {item.badge && iconId === "0" && !item.svgIcon && (
                        <span
                          className="text-white text-[9px] font-black px-1 py-0.5 rounded-full"
                          style={{ background: "#ef4444" }}
                        >{item.badge}</span>
                      )}
                    </Link>

                    {/* BJ 드롭다운 (라이브방송 메뉴) */}
                    {item.label === "라이브방송" && (
                      <BjDropdown />
                    )}

                    {/* 드롭다운 */}
                    {item.sub && (
                      <div
                        className="absolute top-full left-0 hidden group-hover:block z-50 w-full rounded-b-lg overflow-hidden"
                        style={{ background: "var(--brand)", boxShadow: "0 6px 12px rgba(0,0,0,0.18)", minWidth: 100 }}
                      >
                        {/* 삼각형 화살표 */}
                        <div
                          className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0"
                          style={{
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderBottom: `6px solid var(--brand)`,
                          }}
                        />
                        <ul className="py-1">
                          {item.sub.map((s) => (
                            <li key={s.href} className="mx-1.5 my-1">
                              <Link
                                href={s.href}
                                className="block px-2 py-1 text-[13px] text-white font-medium rounded hover:bg-black/10 transition-colors"
                              >
                                {s.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 다크/라이트 스위치 + 로그인/유저 버튼 */}
          <div className="shrink-0 flex items-center gap-2">
            <button onClick={toggleDarkMode} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--bg)", border: "1px solid var(--border)" }} title={isDark ? "라이트 모드" : "다크 모드"}>
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-primary)" }}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-primary)" }}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              )}
            </button>
          {authReady && (user ? (
            <>
              {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
                <Link href="/admin" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>
                  관리자
                </Link>
              )}
              <Link href="/mypage" className="text-xs font-bold hover:underline" style={{ color: "var(--text-secondary)" }}>{user.nickname}</Link>
              <Link href="/mypage" className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                마이페이지
              </Link>
              <button onClick={handleLogout} className="text-xs font-bold px-4 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setModal("login")} className="text-xs font-bold px-4 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
                로그인
              </button>
              <button onClick={() => setModal("register")} className="text-xs font-bold px-4 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>
                회원가입
              </button>
            </>
          ))}
          </div>
        </div>
      </header>

      {/* ── 메인 영역 ── */}
      {pathname.startsWith("/live") ? (
        /* 라이브 페이지: 사이드바 없이 전체 폭 */
        <main className="w-full flex-1 pb-[72px] lg:pb-0">
          {children}
        </main>
      ) : (
        /* 일반 페이지: 3컬럼 */
        <main className="w-full lg:max-w-[1572px] flex gap-2 pb-[72px] lg:pb-6 mt-2">
          <div className="hidden lg:flex">
            <RightSidebar
              user={user}
              authReady={authReady}
              onLoginSuccess={() => { fetchUser(); }}
              onOpenRegister={() => setModal("register")}
              onLogout={handleLogout}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2 px-2 lg:px-0">
            {children}
          </div>
          <div className="hidden lg:flex">
            <LeftSidebar />
          </div>
        </main>
      )}

      {/* ── 데스크탑 푸터 ── */}
      <footer
        className="hidden lg:block w-full mt-4"
        style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-[1572px] mx-auto py-6 px-6 flex items-center gap-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={isDark ? "/livetv_logo_dark.png" : "/real_logo/livetv_logo.png"} alt="LIVETV" className="h-20 object-contain shrink-0" />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            라이브Felix는 스포츠 중계 및 분석 정보를 제공하는 플랫폼입니다.
          </p>
        </div>
      </footer>

      {/* ── 더보기 메뉴 패널 ── */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-[60]"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div
            className="absolute bottom-[56px] left-0 right-0 rounded-t-2xl p-4 pb-2"
            style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>전체 메뉴</p>
              <button onClick={() => setShowMore(false)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: "var(--bg)" }}>
                <i className="fas fa-times text-xs" style={{ color: "var(--text-secondary)" }} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 pb-2">
              {MORE_MENU.map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  onClick={() => setShowMore(false)}
                  className="flex flex-col items-center gap-1.5 py-2 rounded-lg transition-colors"
                  style={{ color: pathname.startsWith(m.href) ? "var(--brand)" : "var(--text-secondary)" }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: pathname.startsWith(m.href) ? "var(--brand-light)" : "var(--bg)", border: "1px solid var(--border)" }}
                  >
                    <i className={`${m.icon} text-[18px]`} />
                  </div>
                  <span className="text-[10px] font-bold text-center leading-tight">{m.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 모바일 하단 네비게이션 (lg 이상 숨김) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] flex items-stretch"
        style={{ height: "56px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}
      >
        {BOTTOM_NAV.map((item) => {
          if (item.href === "__more__") {
            return (
              <button
                key="more"
                onClick={() => setShowMore(v => !v)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5"
                style={{ color: showMore ? "var(--brand)" : "var(--text-secondary)" }}
              >
                <i className={`${item.icon} text-lg`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          }
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setShowMore(false)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ color: isActive ? "var(--brand)" : "var(--text-secondary)" }}
            >
              <i
                className={`${item.icon} text-lg`}
                style={{ color: isActive ? "var(--brand)" : "var(--text-secondary)" }}
              />
              <span className="text-[10px] font-bold">{item.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 rounded-t-full"
                  style={{ width: "20px", height: "3px", background: "var(--brand)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── 로그인/회원가입 모달 ── */}
      {modal && (
        <AuthModal
          defaultTab={modal}
          onClose={() => setModal(null)}
          onSuccess={() => { fetchUser(); setModal(null); }}
        />
      )}

      {/* ── 임시 색상 팔레트 (고객 프레젠테이션용) ── */}
      {/* <ThemePalette /> */}

      {/* ── 플로팅 패널 (모바일 전용) ── */}
      {!showMore && (
        <FloatingPanel
          user={user}
          onLogout={handleLogout}
          onOpenLogin={() => setModal("login")}
          onOpenRegister={() => setModal("register")}
        />
      )}

    </div>
  );
}

function BjDropdown() {
  const [bjs, setBjs] = useState<{ id: number; streamKey: string; nickname: string; isLive: boolean }[]>([]);

  useEffect(() => {
    fetch("/api/bj/all")
      .then(r => r.json())
      .then(data => setBjs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/bj/all").then(r => r.json()).then(data => setBjs(Array.isArray(data) ? data : [])).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (bjs.length === 0) return null;

  return (
    <div
      className="absolute top-full left-0 hidden group-hover:block z-50 w-full rounded-b-lg overflow-hidden"
      style={{ background: "var(--brand)", boxShadow: "0 6px 12px rgba(0,0,0,0.18)", minWidth: 100 }}
    >
      <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0" style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid var(--brand)" }} />
      <ul className="py-1">
        {bjs.map(bj => (
          <li key={bj.id} className="mx-1.5 my-1">
            <Link href="/live" className="flex items-center justify-between px-2 py-1 text-[12px] text-white font-medium rounded hover:bg-black/10 transition-colors">
              <span>{bj.nickname}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bj.isLive ? "bg-red-500" : "bg-white/20"}`}>
                {bj.isLive ? "ON" : "OFF"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

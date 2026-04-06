"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESKTOP_NAV = [
  { label: "스폰업체", href: "/partners" },
  { label: "스포츠 중계", href: "/broadcast", badge: "LIVE", sub: [
    { label: "라이브 중계", href: "/broadcast" },
    { label: "중계 일정",   href: "/broadcast" },
  ]},
  { label: "스포츠 분석", href: "/analysis/premium", sub: [
    { label: "프리미엄 분석", href: "/analysis/premium" },
    { label: "분석 포스트",   href: "/analysis" },
  ]},
  { label: "스포츠 정보", href: "/sports-info/standings", sub: [
    { label: "스코어 정보", href: "/sports-info/standings" },
    { label: "스포츠 뉴스", href: "/sports-info" },
  ]},
  { label: "유튜브", href: "/youtube/highlights" },
  { label: "이벤트", href: "/events", sub: [
    { label: "이벤트매치", href: "/events" },
    { label: "출석체크",   href: "/attendance" },
  ]},
  { label: "포인트 전환", href: "/points" },
  { label: "공지사항",   href: "/notice" },
];

const BOTTOM_NAV = [
  { icon: "fas fa-home",           label: "홈",    href: "/" },
  { icon: "fas fa-play-circle",    label: "중계",  href: "/broadcast" },
  { icon: "fas fa-chart-pie",      label: "분석",  href: "/analysis/premium" },
  { icon: "fa-brands fa-youtube",  label: "유튜브", href: "/youtube/highlights" },
  { icon: "fas fa-ellipsis-h",     label: "더보기", href: "__more__" },
];

export default function WideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)" }}>

      {/* 모바일 헤더 */}
      <header
        className="lg:hidden w-full sticky top-0 z-50 flex items-center justify-between px-4"
        style={{ height: "56px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="font-black text-base px-3 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>
            LIVE<span style={{ color: "#000" }}>TV</span>
          </div>
        </Link>
        <button className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
          로그인
        </button>
      </header>

      {/* 데스크탑 헤더 */}
      <header className="hidden lg:flex w-full sticky top-0 z-50 items-center" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <div className="w-full max-w-[1200px] mx-auto flex items-center h-[60px] px-6 gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="font-black text-xl px-3 py-1.5 rounded-lg" style={{ background: "var(--brand)", color: "#fff" }}>
              LIVE<span style={{ color: "#000" }}>TV</span>
            </div>
          </Link>
          <nav className="flex items-center h-full flex-1">
            <ul className="flex items-center h-full m-0 list-none">
              {DESKTOP_NAV.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li
                    key={item.href}
                    className="relative h-full group"
                    onMouseEnter={e => {
                      const link = e.currentTarget.querySelector(":scope > a") as HTMLElement;
                      if (!link) return;
                      link.style.color = "var(--brand)";
                      link.style.borderBottom = "2px solid var(--brand)";
                    }}
                    onMouseLeave={e => {
                      const link = e.currentTarget.querySelector(":scope > a") as HTMLElement;
                      if (!link) return;
                      link.style.color = isActive ? "var(--brand)" : "var(--text-primary)";
                      link.style.borderBottom = isActive ? "2px solid var(--brand)" : "2px solid transparent";
                    }}
                  >
                    <Link
                      href={item.href}
                      className="flex items-center gap-1.5 h-full px-4 text-[14px] font-bold whitespace-nowrap transition-all"
                      style={{
                        color: isActive ? "var(--brand)" : "var(--text-primary)",
                        borderBottom: isActive ? "2px solid var(--brand)" : "2px solid transparent",
                      }}
                    >
                      {item.label}
                      {item.badge && (
                        <span className="text-white text-[9px] font-black px-1 py-0.5 rounded-full" style={{ background: "#ef4444" }}>{item.badge}</span>
                      )}
                    </Link>
                    {item.sub && (
                      <div
                        className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:block z-50 min-w-[130px] rounded-b-lg overflow-hidden"
                        style={{ background: "var(--brand)", boxShadow: "0 6px 12px rgba(0,0,0,0.18)" }}
                      >
                        <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-0 h-0"
                          style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderBottom: "6px solid var(--brand)" }} />
                        <ul className="py-1">
                          {item.sub.map((s) => (
                            <li key={s.href} className="mx-1.5 my-1">
                              <Link href={s.href} className="block px-2 py-1 text-[13px] text-white font-medium rounded hover:bg-black/10 transition-colors">
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
          <button className="shrink-0 text-xs font-bold px-4 py-1.5 rounded-lg" style={{ border: "1px solid var(--brand)", color: "var(--brand)" }}>
            로그인
          </button>
        </div>
      </header>

      {/* 콘텐츠 — 사이드바 없이 전체 너비 */}
      <main className="w-full max-w-[1200px] px-4 pb-[72px] lg:pb-8 mt-4">
        {children}
      </main>

      {/* 데스크탑 푸터 */}
      <footer className="hidden lg:block w-full mt-4" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-[1200px] mx-auto py-6 px-6 flex items-center gap-8">
          <div className="font-black text-xl px-3 py-1.5 rounded-lg shrink-0" style={{ background: "var(--brand)", color: "#fff" }}>
            LIVE<span style={{ color: "#000" }}>TV</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            라이브TV는 스포츠 중계 및 분석 정보를 제공하는 플랫폼입니다.
          </p>
        </div>
      </footer>

      {/* 모바일 하단 네비 */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{ height: "56px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
        {BOTTOM_NAV.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              style={{ color: isActive ? "var(--brand)" : "var(--text-secondary)" }}
            >
              <i className={`${item.icon} text-lg`} style={{ color: isActive ? "var(--brand)" : "var(--text-secondary)" }} />
              <span className="text-[10px] font-bold">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 rounded-t-full" style={{ width: "20px", height: "3px", background: "var(--brand)" }} />
              )}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}

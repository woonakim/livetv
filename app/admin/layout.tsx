"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MenuItem { label: string; href: string; icon: string }
interface MenuGroup { label: string; icon: string; items: MenuItem[] }

const MENU: (MenuItem | MenuGroup)[] = [
  { label: "대시보드", href: "/admin", icon: "fas fa-tachometer-alt" },
  {
    label: "회원 관리", icon: "fas fa-users",
    items: [
      { label: "회원 목록", href: "/admin/users", icon: "fas fa-list" },
      { label: "활동 보상 설정", href: "/admin/rewards", icon: "fas fa-star" },
      { label: "레벨 설정", href: "/admin/levels", icon: "fas fa-layer-group" },
    ],
  },
  {
    label: "콘텐츠 관리", icon: "fas fa-edit",
    items: [
      { label: "제휴업체", href: "/admin/partners", icon: "fas fa-handshake" },
      { label: "공지사항", href: "/admin/notices", icon: "fas fa-bullhorn" },
      { label: "채팅 관리", href: "/admin/chat", icon: "fas fa-comments" },
      { label: "배너 관리", href: "/admin/banners", icon: "fas fa-image" },
      { label: "팝업 관리", href: "/admin/popups", icon: "fas fa-window-restore" },
    ],
  },
  {
    label: "픽스터/BJ", icon: "fas fa-chart-pie",
    items: [
      { label: "픽스터 관리", href: "/admin/picksters", icon: "fas fa-user-check" },
      { label: "BJ 관리", href: "/admin/bj", icon: "fas fa-video" },
    ],
  },
  {
    label: "이벤트 관리", icon: "fas fa-gift",
    items: [
      { label: "이벤트매치", href: "/admin/events", icon: "fas fa-trophy" },
      { label: "이벤트 게시판", href: "/admin/event-board", icon: "fas fa-clipboard" },
      { label: "포인트 상품", href: "/admin/products", icon: "fas fa-box" },
      { label: "포인트 내역", href: "/admin/point-logs", icon: "fas fa-history" },
      { label: "포인트 교환", href: "/admin/exchanges", icon: "fas fa-exchange-alt" },
      { label: "출석 내역", href: "/admin/attendance", icon: "fas fa-calendar-check" },
    ],
  },
  {
    label: "통계/기록", icon: "fas fa-chart-bar",
    items: [
      { label: "접속 기록", href: "/admin/access-logs", icon: "fas fa-chart-line" },
    ],
  },
  { label: "사이트 설정", href: "/admin/settings", icon: "fas fa-cog" },
];

function isGroup(item: MenuItem | MenuGroup): item is MenuGroup {
  return "items" in item;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; nickname: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user && (d.user.role === "ADMIN" || d.user.role === "SUPERADMIN")) {
        setUser(d.user);
      } else {
        router.replace("/");
      }
      setLoading(false);
    }).catch(() => { router.replace("/"); setLoading(false); });
  }, [router]);

  // 현재 페이지가 포함된 그룹 자동 펼침
  useEffect(() => {
    for (const item of MENU) {
      if (isGroup(item) && item.items.some(sub => pathname.startsWith(sub.href))) {
        setOpenGroups(prev => { const next = new Set(Array.from(prev)); next.add(item.label); return next; });
      }
    }
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => {
      const next = new Set(Array.from(prev));
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">로딩중...</div>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sideOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSideOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-56 bg-gray-900 text-white flex flex-col transition-transform lg:translate-x-0 ${sideOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-700">
          <Link href="/admin" className="text-sm font-bold tracking-wide">LIVETV ADMIN</Link>
          <button className="lg:hidden text-gray-400" onClick={() => setSideOpen(false)}>
            <i className="fas fa-times" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {MENU.map((item) => {
            if (isGroup(item)) {
              const isOpen = openGroups.has(item.label);
              const hasActive = item.items.some(sub => pathname.startsWith(sub.href));
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors ${hasActive ? "text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
                  >
                    <span className="flex items-center gap-3">
                      <i className={`${item.icon} w-4 text-center text-xs`} />
                      {item.label}
                    </span>
                    <i className={`fas fa-chevron-${isOpen ? "down" : "right"} text-[9px] transition-transform`} />
                  </button>
                  {isOpen && (
                    <div className="ml-4 border-l border-gray-700">
                      {item.items.map(sub => {
                        const active = pathname.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setSideOpen(false)}
                            className={`flex items-center gap-2 pl-4 pr-4 py-2 text-[12px] transition-colors ${active ? "bg-gray-700 text-white font-bold" : "text-gray-500 hover:text-white hover:bg-gray-800"}`}
                          >
                            <i className={`${sub.icon} w-3 text-center text-[10px]`} />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // 단독 메뉴
            const m = item as MenuItem;
            const active = m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setSideOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${active ? "bg-gray-700 text-white font-bold" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
              >
                <i className={`${m.icon} w-4 text-center text-xs`} />
                {m.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <p className="text-[11px] text-gray-500">{user.nickname} ({user.role})</p>
          <Link href="/" className="text-[11px] text-gray-500 hover:text-white">사이트로 돌아가기</Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <button className="lg:hidden text-gray-600" onClick={() => setSideOpen(true)}>
            <i className="fas fa-bars text-lg" />
          </button>
          <div className="text-sm font-semibold text-gray-700 hidden lg:block">관리자 패널</div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[12px] font-bold px-3 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <i className="fas fa-external-link-alt text-[10px] mr-1" />사이트 이동
            </Link>
            <span className="text-xs text-gray-500">{user.nickname}</span>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

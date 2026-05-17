"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { playAlarm, AlarmSoundKey } from "@/lib/alarm-sounds";

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
      { label: "IP 차단", href: "/admin/banned-ips", icon: "fas fa-ban" },
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
      { label: "한줄공지", href: "/admin/ticker", icon: "fas fa-scroll" },
      { label: "자동 분석", href: "/admin/auto-analysis", icon: "fas fa-robot" },
      { label: "분석글 관리", href: "/admin/analysis-posts", icon: "fas fa-newspaper" },
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
      { label: "감사 로그", href: "/admin/logs", icon: "fas fa-clipboard-list" },
      { label: "최근 인증 내역", href: "/admin/phone-logs", icon: "fas fa-mobile-alt" },
    ],
  },
  { label: "사이트 설정", href: "/admin/settings", icon: "fas fa-cog" },
  { label: "SEO 설정", href: "/admin/seo", icon: "fas fa-search" },
  {
    label: "문서", icon: "fas fa-book",
    items: [
      { label: "개발 인수인계", href: "/admin/docs/handover", icon: "fas fa-file-code" },
      { label: "운영 가이드", href: "/admin/docs/guide", icon: "fas fa-file-alt" },
    ],
  },
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

  // 대기 신청 건수
  const [pendingBj, setPendingBj] = useState(0);
  const [pendingPickster, setPendingPickster] = useState(0);
  const [pendingExchange, setPendingExchange] = useState(0);
  // 최근 감사 로그
  interface LogEntry { nickname: string; action: string; ip: string; createdAt: string; }
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(true);

  // 접속자 목록
  interface OnlineUser { nickname: string; isGuest: boolean; joinedAt: number; }
  const [onlineUsers, setOnlineUsers] = useState<{ members: OnlineUser[]; guests: OnlineUser[]; count: number }>({ members: [], guests: [], count: 0 });
  const [showOnline, setShowOnline] = useState(false);

  // 알림 시스템
  const [alarmMuted, setAlarmMuted] = useState(false);
  const [newNotify, setNewNotify] = useState<{ type: string; nickname: string; product?: string } | null>(null);
  const alarmInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const alarmSoundRef = useRef<AlarmSoundKey>("beep");

  // 사이트 설정에서 알림 사운드 로드
  useEffect(() => {
    fetch("/api/site-settings").then(r => r.json()).then(d => {
      if (d.adminAlarmSound) alarmSoundRef.current = d.adminAlarmSound as AlarmSoundKey;
    }).catch(() => {});
  }, []);

  const playAlarmSound = useCallback(() => {
    playAlarm(alarmSoundRef.current);
  }, []);

  const startRepeatAlarm = useCallback(() => {
    if (alarmInterval.current) clearInterval(alarmInterval.current);
    alarmInterval.current = setInterval(() => {
      if (!alarmMuted) playAlarmSound();
    }, 60000);
  }, [alarmMuted, playAlarmSound]);

  const stopRepeatAlarm = useCallback(() => {
    if (alarmInterval.current) { clearInterval(alarmInterval.current); alarmInterval.current = null; }
  }, []);

  // 대기 건수 로드 + 미처리 건 있으면 알림 시작
  const loadPending = useCallback((initialLoad = false) => {
    if (!user) return;
    let totalPending = 0;
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()).then(d => {
        setPendingPickster(d.pendingPicksters || 0);
        setPendingExchange(d.pendingExchanges || 0);
        totalPending += (d.pendingPicksters || 0) + (d.pendingExchanges || 0);
      }).catch(() => {}),
      fetch("/api/admin/bj").then(r => r.json()).then(d => {
        if (Array.isArray(d)) {
          const cnt = d.filter((b: { isApproved: boolean }) => !b.isApproved).length;
          setPendingBj(cnt);
          totalPending += cnt;
        }
      }).catch(() => {}),
    ]).then(() => {
      if (initialLoad && totalPending > 0 && !alarmMuted) {
        playAlarmSound();
        startRepeatAlarm();
      }
    });
  }, [user, alarmMuted, playAlarmSound, startRepeatAlarm]);

  // Socket.IO 관리자 알림
  useEffect(() => {
    if (!user) return;
    const s = getSocket();
    s.emit("admin:join");

    const onNotify = (data: { type: string; data: { nickname: string; product?: string } }) => {
      const NOTIFY_LABEL: Record<string, string> = { bj_apply: "BJ 신청", pickster_apply: "픽스터 신청", exchange_apply: "포인트 교환" };
      setNewNotify({ type: NOTIFY_LABEL[data.type] || data.type, nickname: data.data.nickname, product: data.data.product });
      loadPending();
      if (!alarmMuted) playAlarmSound();
      startRepeatAlarm();
      // 5초 후 토스트 숨김
      setTimeout(() => setNewNotify(null), 5000);
    };

    const onOnlineUsers = (data: { members: OnlineUser[]; guests: OnlineUser[]; count: number }) => {
      setOnlineUsers(data);
    };

    s.on("admin:notify", onNotify);
    s.on("admin:online-users", onOnlineUsers);
    return () => { s.off("admin:notify", onNotify); s.off("admin:online-users", onOnlineUsers); };
  }, [user, alarmMuted, playAlarmSound, startRepeatAlarm, loadPending]);

  // 대기 건이 0이면 반복 알림 중지
  useEffect(() => {
    if (pendingBj + pendingPickster + pendingExchange === 0) stopRepeatAlarm();
    else if (!alarmMuted) startRepeatAlarm();
  }, [pendingBj, pendingPickster, pendingExchange, alarmMuted, startRepeatAlarm, stopRepeatAlarm]);

  useEffect(() => { return () => stopRepeatAlarm(); }, [stopRepeatAlarm]);

  useEffect(() => {
    if (!user) return;
    loadPending(true);
    // 최근 감사 로그
    fetch("/api/admin/logs?limit=5").then(r => r.json()).then(d => {
      setRecentLogs((d.logs || []).slice(0, 3));
    }).catch(() => {});
  }, [user]);

  if (loading) return <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">로딩중...</div>;
  if (!user) return null;

  const alerts = [
    pendingBj > 0 && { label: "BJ 신청", count: pendingBj, href: "/admin/bj" },
    pendingPickster > 0 && { label: "픽스터 신청", count: pendingPickster, href: "/admin/picksters" },
    pendingExchange > 0 && { label: "포인트 교환 신청", count: pendingExchange, href: "/admin/exchanges" },
  ].filter(Boolean) as { label: string; count: number; href: string }[];

  const ACTION_LABELS: Record<string, string> = {
    "user.update": "회원 수정", "bj.update": "BJ 관리", "event.create": "이벤트 생성",
    "site.settings.update": "사이트 설정", "site.seo.update": "SEO 설정",
    "auto-analysis.settings.update": "자동 분석 설정", "auto-analysis.manual-run": "자동 분석 실행",
    "auto-analysis.publish": "분석글 게시", "auto-analysis.delete": "분석글 삭제",
  };

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

        <div className="border-t border-gray-700">
          <button
            onClick={() => setShowOnline(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            title="현재 접속자"
          >
            <span className="flex items-center gap-2">
              <i className="fas fa-user-friends text-[11px]" />
              현재 접속자
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">{onlineUsers.count}</span>
            </span>
            <i className={`fas fa-chevron-${showOnline ? "left" : "right"} text-[9px]`} />
          </button>
          <div className="p-4">
            <p className="text-[11px] text-gray-500">{user.nickname} ({user.role})</p>
            <Link href="/" className="text-[11px] text-gray-500 hover:text-white">사이트로 돌아가기</Link>
          </div>
        </div>
      </aside>

      {/* 접속자 슬라이드 패널 — 사이드바 우측에 붙음 */}
      {showOnline && (
        <div
          className="fixed top-0 z-40 h-screen w-[220px] bg-gray-800 text-white border-r border-gray-700 shadow-xl flex flex-col"
          style={{ left: "14rem" /* w-56 = 14rem */ }}
        >
          <div className="h-14 flex items-center justify-between px-3 border-b border-gray-700 shrink-0">
            <span className="text-[12px] font-bold">
              접속자 <span className="text-emerald-400">{onlineUsers.count}</span>
            </span>
            <button onClick={() => setShowOnline(false)} className="text-gray-400 hover:text-white text-[11px]">
              <i className="fas fa-times" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 text-[11px]">
            {onlineUsers.members.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide">회원 {onlineUsers.members.length}</div>
                {onlineUsers.members.map((u, i) => (
                  <div key={`m${i}`} className="px-3 py-1 flex items-center gap-2 hover:bg-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{u.nickname}</span>
                  </div>
                ))}
              </div>
            )}
            {onlineUsers.guests.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wide">비회원 {onlineUsers.guests.length}</div>
                {onlineUsers.guests.map((u, i) => (
                  <div key={`g${i}`} className="px-3 py-1 flex items-center gap-2 hover:bg-gray-700 text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" />
                    <span className="truncate">{u.nickname}</span>
                  </div>
                ))}
              </div>
            )}
            {onlineUsers.count === 0 && (
              <div className="px-3 py-4 text-center text-gray-500">접속자 없음</div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <button className="lg:hidden text-gray-600" onClick={() => setSideOpen(true)}>
            <i className="fas fa-bars text-lg" />
          </button>
          <div className="text-sm font-semibold text-gray-700 hidden lg:block">관리자 패널</div>
          <div className="flex items-center gap-3">
            <button onClick={() => { setAlarmMuted(!alarmMuted); if (!alarmMuted) stopRepeatAlarm(); }}
              className="text-[11px] font-bold px-2 py-1.5 rounded transition-colors"
              style={{ background: alarmMuted ? "#fee2e2" : "#dcfce7", color: alarmMuted ? "#dc2626" : "#16a34a" }}
              title={alarmMuted ? "알림 꺼짐" : "알림 켜짐"}>
              <i className={`fas ${alarmMuted ? "fa-bell-slash" : "fa-bell"} mr-1`} />
              {alarmMuted ? "알림 OFF" : "알림 ON"}
            </button>
            <Link href="/admin/team-logos" className="text-[12px] font-bold px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
              <i className="fas fa-search text-[10px] mr-1" />로고 검색
            </Link>
            <Link href="/" className="text-[12px] font-bold px-3 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <i className="fas fa-external-link-alt text-[10px] mr-1" />사이트 이동
            </Link>
            <span className="text-xs text-gray-500">{user.nickname}</span>
          </div>
        </header>
        {/* 대기 신청 알림 배너 */}
        {alerts.length > 0 && (
          <div className="border-b border-gray-200 bg-gray-50">
            {alerts.map(a => (
              <Link key={a.label} href={a.href} className="flex items-center gap-1 px-4 py-1 text-[12px] hover:bg-gray-100 transition-colors" style={{ color: "#374151" }}>
                <i className="fas fa-exclamation-circle text-[10px] text-amber-500" />
                {a.label}건이 <span className="font-bold text-red-600">{a.count}건</span> 있습니다
                <i className="fas fa-chevron-right text-[8px] ml-1 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
      </div>

      {/* 신규 신청 알림 토스트 */}
      {newNotify && (
        <div className="fixed top-16 right-4 z-[60] w-[320px] rounded-lg shadow-2xl overflow-hidden animate-bounce-once"
          style={{ background: "#fff", border: "2px solid #ef4444" }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <i className="fas fa-bell text-red-500 text-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-800">
                {newNotify.type}
              </p>
              <p className="text-[11px] text-gray-500">
                <span className="font-bold text-blue-600">{newNotify.nickname}</span>
                {newNotify.product ? `님이 ${newNotify.product} 교환을 신청했습니다` : "님이 신청했습니다"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 최근 감사 로그 플로팅 */}
      {showLogs && recentLogs.length > 0 && !newNotify && (
        <div className="fixed top-16 right-4 z-50 w-[340px] rounded-lg shadow-xl overflow-hidden" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800">
            <span className="text-[11px] font-bold text-white">최근 관리 활동</span>
            <button onClick={() => setShowLogs(false)} className="text-gray-400 hover:text-white text-[11px]">✕</button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLogs.map((log, i) => (
              <div key={i} className="px-3 py-2">
                <div className="text-[11px]" style={{ color: "#374151" }}>
                  <span className="font-bold text-blue-600">{log.nickname}</span>
                  <span className="text-gray-500"> 관리자가 </span>
                  <span className="font-bold">{ACTION_LABELS[log.action] || log.action}</span>
                  <span className="text-gray-500">을(를) 변경하였습니다.</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                  <span>{new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  <span>·</span>
                  <span className="font-mono">{log.ip}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

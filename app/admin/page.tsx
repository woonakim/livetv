"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalUsers: number; todayUsers: number; totalPartners: number; activeEvents: number;
  pendingExchanges: number; totalMessages: number; todayMessages: number;
  todayVisitMember: number; todayVisitGuest: number; todayLogins: number;
  todayUniqueIps: number; todayAttendance: number; totalPosts: number; todayPosts: number;
  totalPicksters: number; pendingPicksters: number;
  weeklyVisits: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats);
  }, []);

  if (!stats) {
    return <div className="p-8 text-center"><div className="w-8 h-8 rounded-full mx-auto animate-spin" style={{ border: "3px solid var(--border)", borderTopColor: "var(--brand)" }} /></div>;
  }

  const todayTotal = stats.todayVisitMember + stats.todayVisitGuest;
  const maxVisit = Math.max(...stats.weeklyVisits.map(v => v.count), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>대시보드</h1>
        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}</span>
      </div>

      {/* ── 오늘 접속 현황 ── */}
      <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, var(--brand), #0284c7)", color: "#fff" }}>
        <p className="text-sm font-bold opacity-90 mb-3">오늘 접속 현황</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-3xl font-black">{todayTotal}</p>
            <p className="text-xs opacity-75">총 접속자</p>
          </div>
          <div>
            <p className="text-3xl font-black">{stats.todayVisitMember}</p>
            <p className="text-xs opacity-75">회원 접속</p>
          </div>
          <div>
            <p className="text-3xl font-black">{stats.todayVisitGuest}</p>
            <p className="text-xs opacity-75">비회원 접속</p>
          </div>
          <div>
            <p className="text-3xl font-black">{stats.todayLogins}</p>
            <p className="text-xs opacity-75">로그인 수</p>
          </div>
          <div>
            <p className="text-3xl font-black">{stats.todayUniqueIps}</p>
            <p className="text-xs opacity-75">고유 IP</p>
          </div>
        </div>
      </div>

      {/* ── 주요 지표 카드 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "오늘 신규가입", value: stats.todayUsers, icon: "👤", href: "/admin/users", color: "#3b82f6", sub: `전체 ${stats.totalUsers.toLocaleString()}명` },
          { label: "오늘 출석체크", value: stats.todayAttendance, icon: "📅", href: "/admin/attendance", color: "#10b981", sub: "출석 현황" },
          { label: "오늘 채팅", value: stats.todayMessages, icon: "💬", href: "/admin/chat", color: "#8b5cf6", sub: `누적 ${stats.totalMessages.toLocaleString()}건` },
          { label: "교환 대기", value: stats.pendingExchanges, icon: "🔄", href: "/admin/exchanges", color: stats.pendingExchanges > 0 ? "#ef4444" : "#6b7280", sub: "처리 필요" },
        ].map(c => (
          <Link key={c.label} href={c.href} className="rounded-lg p-4 transition-shadow hover:shadow-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.color}15`, color: c.color }}>{c.sub}</span>
            </div>
            <p className="text-2xl font-black" style={{ color: c.color }}>{c.value.toLocaleString()}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)" }}>{c.label}</p>
          </Link>
        ))}
      </div>

      {/* ── 7일 접속 추이 + 사이트 현황 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>📊 7일 접속 추이 (고유 IP)</h2>
          <div className="flex items-end gap-1 h-[120px]">
            {stats.weeklyVisits.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-bold" style={{ color: "var(--brand)" }}>{v.count}</span>
                <div className="w-full rounded-t" style={{ height: `${Math.max((v.count / maxVisit) * 90, 4)}px`, background: i === stats.weeklyVisits.length - 1 ? "var(--brand)" : "rgba(14,165,233,0.3)" }} />
                <span className="text-[9px]" style={{ color: "var(--text-secondary)" }}>{v.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>🏠 사이트 현황</h2>
          <div className="space-y-2">
            {[
              { label: "전체 회원", value: stats.totalUsers, color: "#3b82f6" },
              { label: "활성 제휴업체", value: stats.totalPartners, color: "#10b981" },
              { label: "진행중 이벤트", value: stats.activeEvents, color: "#f59e0b" },
              { label: "분석 포스트", value: stats.totalPosts, sub: stats.todayPosts > 0 ? `오늘 +${stats.todayPosts}` : "", color: "#8b5cf6" },
              { label: "등록 픽스터", value: stats.totalPicksters, sub: stats.pendingPicksters > 0 ? `대기 ${stats.pendingPicksters}` : "", color: "#ec4899" },
              { label: "누적 채팅", value: stats.totalMessages, color: "#6366f1" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-black" style={{ color: item.color }}>{item.value.toLocaleString()}</span>
                  {item.sub && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${item.color}15`, color: item.color }}>{item.sub}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 빠른 메뉴 ── */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-bold mb-3" style={{ color: "var(--text-primary)" }}>⚡ 빠른 메뉴</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { label: "회원 관리", href: "/admin/users", icon: "👤" },
            { label: "제휴업체 관리", href: "/admin/partners", icon: "🤝" },
            { label: "이벤트매치", href: "/admin/events", icon: "🎯" },
            { label: "공지사항", href: "/admin/notices", icon: "📢" },
            { label: "포인트 교환", href: "/admin/exchanges", icon: "💰" },
            { label: "활동 보상 설정", href: "/admin/rewards", icon: "⭐" },
            { label: "접속 기록", href: "/admin/access-logs", icon: "📊" },
            { label: "픽스터 관리", href: "/admin/picksters", icon: "🏆" },
            { label: "채팅 관리", href: "/admin/chat", icon: "💬" },
            { label: "포인트 내역", href: "/admin/point-logs", icon: "📋" },
            { label: "포인트 상품", href: "/admin/products", icon: "🎁" },
            { label: "사이트 설정", href: "/admin/settings", icon: "⚙️" },
          ].map(m => (
            <Link key={m.href} href={m.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors hover:opacity-80" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="text-lg">{m.icon}</span>
              <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{m.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers, todayUsers, totalPartners, activeEvents,
    pendingExchanges, totalMessages, todayMessages,
    todayVisitMember, todayVisitGuest, todayLogins,
    todayUniqueIps, todayAttendance, totalPosts,
    todayPosts, totalPicksters, pendingPicksters,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.partner.count({ where: { isActive: true } }),
    prisma.event.count({ where: { isActive: true, deadline: { gte: new Date() } } }),
    prisma.pointExchange.count({ where: { status: "PENDING" } }),
    prisma.chatMessage.count(),
    prisma.chatMessage.count({ where: { createdAt: { gte: today } } }),
    // 당일 접속 (회원)
    prisma.accessLog.groupBy({ by: ["userId"], where: { type: "visit", createdAt: { gte: today }, userId: { not: null } } }).then(r => r.length),
    // 당일 접속 (비회원)
    prisma.accessLog.groupBy({ by: ["ip"], where: { type: "visit", createdAt: { gte: today }, userId: null } }).then(r => r.length),
    // 당일 로그인
    prisma.accessLog.count({ where: { type: "login", createdAt: { gte: today } } }),
    // 당일 고유 IP
    prisma.accessLog.groupBy({ by: ["ip"], where: { createdAt: { gte: today } } }).then(r => r.length),
    // 당일 출석
    prisma.attendance.count({ where: { createdAt: { gte: today } } }),
    // 분석글
    prisma.analysisPost.count(),
    prisma.analysisPost.count({ where: { createdAt: { gte: today } } }),
    // 픽스터
    prisma.picksterProfile.count({ where: { isApproved: true, isActive: true } }),
    prisma.picksterProfile.count({ where: { isApproved: false } }),
  ]);

  // 최근 7일 접속 추이
  const weeklyVisits: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = await prisma.accessLog.groupBy({
      by: ["ip"],
      where: { createdAt: { gte: d, lt: next } },
    }).then(r => r.length);
    weeklyVisits.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, count });
  }

  return NextResponse.json({
    totalUsers, todayUsers, totalPartners, activeEvents,
    pendingExchanges, totalMessages, todayMessages,
    todayVisitMember, todayVisitGuest, todayLogins,
    todayUniqueIps, todayAttendance, totalPosts, todayPosts,
    totalPicksters, pendingPicksters, weeklyVisits,
  });
}

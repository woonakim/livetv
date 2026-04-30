export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { todayKST } from "@/lib/date-kr";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = todayKST();

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
    prisma.accessLog.groupBy({ by: ["userId"], where: { type: "visit", createdAt: { gte: today }, userId: { not: null } } }).then(r => r.length),
    prisma.accessLog.groupBy({ by: ["ip"], where: { type: "visit", createdAt: { gte: today }, userId: null } }).then(r => r.length),
    prisma.accessLog.count({ where: { type: "login", createdAt: { gte: today } } }),
    prisma.accessLog.groupBy({ by: ["ip"], where: { createdAt: { gte: today } } }).then(r => r.length),
    prisma.attendance.count({ where: { date: { gte: today } } }),
    prisma.analysisPost.count(),
    prisma.analysisPost.count({ where: { createdAt: { gte: today } } }),
    prisma.picksterProfile.count({ where: { isApproved: true, isActive: true } }),
    prisma.picksterProfile.count({ where: { isApproved: false } }),
  ]);

  // 최근 7일 접속 추이 (KST 기준)
  const weeklyVisits: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const kstDate = new Date(dayStart.getTime() + 9 * 60 * 60 * 1000);
    const count = await prisma.accessLog.groupBy({
      by: ["ip"],
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
    }).then(r => r.length);
    weeklyVisits.push({ date: `${kstDate.getUTCMonth() + 1}/${kstDate.getUTCDate()}`, count });
  }

  return NextResponse.json({
    totalUsers, todayUsers, totalPartners, activeEvents,
    pendingExchanges, totalMessages, todayMessages,
    todayVisitMember, todayVisitGuest, todayLogins,
    todayUniqueIps, todayAttendance, totalPosts, todayPosts,
    totalPicksters, pendingPicksters, weeklyVisits,
  });
}

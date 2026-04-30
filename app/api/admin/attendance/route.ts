export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { todayDateKST } from "@/lib/date-kr";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const dateFilter = searchParams.get("date") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (search) {
    where.user = { OR: [{ nickname: { contains: search } }, { username: { contains: search } }] };
  }

  if (dateFilter) {
    // dateFilter는 YYYY-MM-DD 형식, KST 기준으로 해석
    const [y, m, d] = dateFilter.split("-").map(Number);
    const kstStart = new Date(Date.UTC(y, m - 1, d) - 9 * 60 * 60 * 1000);
    const kstEnd = new Date(kstStart.getTime() + 24 * 60 * 60 * 1000);
    where.date = { gte: kstStart, lt: kstEnd };
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, nickname: true, username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  // 통계 (KST 기준)
  const today = todayDateKST();
  const [todayCount, totalCount, avgStreak] = await Promise.all([
    prisma.attendance.count({ where: { date: { gte: today } } }),
    prisma.attendance.count(),
    prisma.attendance.aggregate({ _avg: { streak: true } }),
  ]);

  return NextResponse.json({
    records: records.map(r => ({
      id: r.id,
      userId: r.userId,
      nickname: r.user.nickname,
      username: r.user.username,
      date: r.date.toISOString().slice(0, 10),
      points: r.points,
      streak: r.streak,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    stats: {
      todayCount,
      totalCount,
      avgStreak: Math.round(avgStreak._avg.streak || 0),
    },
  });
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

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
    const d = new Date(dateFilter);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.date = { gte: d, lt: next };
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

  // 통계
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayCount, totalCount, avgStreak] = await Promise.all([
    prisma.attendance.count({ where: { createdAt: { gte: today } } }),
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

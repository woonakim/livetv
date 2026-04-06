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
  const type = searchParams.get("type") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (search) {
    where.OR = [
      { ip: { contains: search } },
      { path: { contains: search } },
      { user: { nickname: { contains: search } } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      include: { user: { select: { id: true, nickname: true, username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.accessLog.count({ where }),
  ]);

  // 오늘 통계
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayVisits, todayLogins, todayUniqueIps] = await Promise.all([
    prisma.accessLog.count({ where: { type: "visit", createdAt: { gte: today } } }),
    prisma.accessLog.count({ where: { type: "login", createdAt: { gte: today } } }),
    prisma.accessLog.groupBy({ by: ["ip"], where: { createdAt: { gte: today } } }).then(r => r.length),
  ]);

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      userId: l.userId,
      nickname: l.user?.nickname || null,
      username: l.user?.username || null,
      type: l.type,
      ip: l.ip,
      fingerprint: l.mac,
      device: l.device,
      browser: l.browser,
      os: l.os,
      referer: l.referer,
      path: l.path,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    stats: { todayVisits, todayLogins, todayUniqueIps },
  });
}

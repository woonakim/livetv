export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 같은 IP 사용한 다른 회원 + IP별 통계
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);

  // 1. 이 회원이 사용한 IP 리스트 (distinct)
  const myIps = await prisma.accessLog.findMany({
    where: { userId: id, ip: { not: "" } },
    select: { ip: true },
    distinct: ["ip"],
    take: 50,
  });
  const ipList = myIps.map(x => x.ip).filter(Boolean);
  if (ipList.length === 0) return NextResponse.json({ ips: [], otherUsers: [] });

  // 2. 각 IP별 다른 사용자 count
  const ipStats = await prisma.accessLog.groupBy({
    by: ["ip"],
    where: { ip: { in: ipList } },
    _count: { _all: true },
  });

  // 3. 같은 IP 사용한 다른 userId 모음
  const dupes = await prisma.accessLog.findMany({
    where: { ip: { in: ipList }, userId: { not: null, notIn: [id] } },
    select: { userId: true, ip: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // userId별 집계 + 어떤 IP가 겹쳤는지
  const userIpMap = new Map<number, { ips: Set<string>; lastSeen: Date }>();
  for (const d of dupes) {
    if (!d.userId) continue;
    if (!userIpMap.has(d.userId)) userIpMap.set(d.userId, { ips: new Set(), lastSeen: d.createdAt });
    userIpMap.get(d.userId)!.ips.add(d.ip);
    if (d.createdAt > userIpMap.get(d.userId)!.lastSeen) userIpMap.get(d.userId)!.lastSeen = d.createdAt;
  }

  // 다른 회원 정보 조회
  const otherUserIds = Array.from(userIpMap.keys());
  const otherUsers = otherUserIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: otherUserIds } },
    select: { id: true, username: true, nickname: true, role: true, isActive: true, createdAt: true, phoneVerified: true },
  }) : [];

  return NextResponse.json({
    ips: ipList.map(ip => {
      const stat = ipStats.find(s => s.ip === ip);
      return { ip, totalAccesses: stat?._count._all || 0 };
    }),
    otherUsers: otherUsers.map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      role: u.role,
      isActive: u.isActive,
      phoneVerified: u.phoneVerified,
      createdAt: u.createdAt.toISOString(),
      sharedIps: Array.from(userIpMap.get(u.id)?.ips || []),
      lastSharedAt: userIpMap.get(u.id)?.lastSeen.toISOString() || null,
    })).sort((a, b) => b.sharedIps.length - a.sharedIps.length),
  });
}

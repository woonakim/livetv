export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 이벤트 목록 — deadline 기준으로 진행중/지난 분리
// active: isActive=true AND deadline > now (투표 가능)
// past: deadline <= now (자동 마감 cron 지연과 무관하게 즉시 분리)
//   isActive=false 이고 deadline 미래인 케이스(관리자 수동 숨김)는 둘 다 안 노출
export async function GET() {
  const now = new Date();
  const [active, past] = await Promise.all([
    prisma.event.findMany({
      where: { isActive: true, deadline: { gt: now } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { votes: true } } },
    }),
    prisma.event.findMany({
      where: { deadline: { lte: now } },
      orderBy: { deadline: "desc" },
      take: 50,
      include: { _count: { select: { votes: true } } },
    }),
  ]);
  return NextResponse.json({ active, past });
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST: 시청 heartbeat (30초마다 호출)
export async function POST(req: NextRequest, { params }: { params: { streamKey: string } }) {
  const { streamKey } = params;

  const profile = await prisma.bjProfile.findUnique({ where: { streamKey } });
  if (!profile || !profile.isLive) return NextResponse.json({ ok: false });

  // IP 추출
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";

  // IP 기반 시청 기록 upsert (누적 + heartbeat)
  await prisma.bjViewLog.upsert({
    where: { bjProfileId_ip: { bjProfileId: profile.id, ip } },
    create: { bjProfileId: profile.id, ip },
    update: { lastSeen: new Date() },
  });

  // 누적 시청자 수 (unique IP)
  const totalUnique = await prisma.bjViewLog.count({
    where: { bjProfileId: profile.id },
  });

  // 현재 시청자 수 (최근 60초 이내 heartbeat)
  const now = new Date();
  const cutoff = new Date(now.getTime() - 60 * 1000);
  const liveViewers = await prisma.bjViewLog.count({
    where: { bjProfileId: profile.id, lastSeen: { gte: cutoff } },
  });

  // DB 업데이트
  await prisma.bjProfile.update({
    where: { id: profile.id },
    data: { viewCount: totalUnique, liveViewers },
  });

  return NextResponse.json({ ok: true, liveViewers, viewCount: totalUnique });
}

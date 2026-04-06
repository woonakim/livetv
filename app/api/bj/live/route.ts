export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 현재 LIVE 중인 BJ 목록 (공개)
export async function GET() {
  const bjs = await prisma.bjProfile.findMany({
    where: { isLive: true, isApproved: true, isActive: true },
    include: { user: { select: { nickname: true, role: true } } },
    orderBy: { liveViewers: "desc" },
  });

  return NextResponse.json(bjs.map(b => ({
    id: b.id,
    streamKey: b.streamKey,
    nickname: b.user.nickname,
    title: b.title,
    description: b.description,
    category: b.category,
    thumbnail: b.thumbnail,
    viewCount: b.viewCount,
    liveViewers: b.liveViewers,
    offlineMsg: b.offlineMsg,
    isLive: b.isLive,
  })));
}

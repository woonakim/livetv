export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 승인된 모든 BJ (ON/OFF 포함)
export async function GET() {
  const bjs = await prisma.bjProfile.findMany({
    where: { isApproved: true, isActive: true },
    include: { user: { select: { nickname: true } } },
    orderBy: [{ isLive: "desc" }, { viewCount: "desc" }],
  });

  return NextResponse.json(bjs.map(b => ({
    id: b.id,
    userId: b.userId,
    streamKey: b.streamKey,
    nickname: b.user.nickname,
    title: b.title,
    description: b.description,
    category: b.category,
    thumbnail: b.thumbnail,
    avatar: b.avatar,
    avatarType: b.avatarType,
    statusMessage: b.statusMessage,
    viewCount: b.viewCount,
    offlineMsg: b.offlineMsg,
    bannerUrl: b.bannerUrl,
    bannerText: b.bannerText,
    isLive: b.isLive,
    liveStartedAt: b.liveStartedAt,
    liveViewers: b.liveViewers,
  })));
}

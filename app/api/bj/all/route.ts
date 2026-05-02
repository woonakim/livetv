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

  // 라이브 BJ는 server.js에 등록된 가짜 시청자 boost를 즉시 적용해서 반환
  // (REST 응답이 실제값을 보여줬다가 socket이 부풀린 값으로 덮어쓰는 1초 flicker 방지)
  type GlobalWithFake = typeof globalThis & { __getBjDisplayedViewers?: (id: number, real: number) => Promise<number> };
  const getDisplayed = (globalThis as GlobalWithFake).__getBjDisplayedViewers;
  const enriched = await Promise.all(bjs.map(async b => {
    let displayed = b.liveViewers;
    if (b.isLive && getDisplayed) {
      try { displayed = await getDisplayed(b.id, b.liveViewers); } catch {}
    }
    return {
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
      liveViewers: displayed,        // 부풀린 값 (시청자에게 노출되는 표시값)
      realViewers: b.liveViewers,     // 실제값 (관리자용)
      bufferLatency: b.bufferLatency,
    };
  }));
  return NextResponse.json(enriched);
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// SRS on_publish / on_unpublish 콜백
// SRS는 JSON 응답 {"code": 0}을 기대함. code != 0이면 방송 차단.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const stream = body?.stream || body?.stream_url || "";
    const action = body?.action || "on_publish";

    // 스트림키 추출: /live/bj_xxx → bj_xxx
    const streamKey = stream.replace(/^\/live\//, "").replace(/^live\//, "");

    if (!streamKey) {
      return NextResponse.json({ code: 1, error: "no stream key" });
    }

    const profile = await prisma.bjProfile.findUnique({ where: { streamKey } });

    if (!profile || !profile.isApproved || !profile.isActive) {
      // 승인 안 된 BJ → code: 1로 방송 차단
      return NextResponse.json({ code: 1, error: "unauthorized" });
    }

    if (action === "on_unpublish" || action === "on_stop") {
      await prisma.bjProfile.update({ where: { id: profile.id }, data: { isLive: false, liveStartedAt: null, liveViewers: 0 } });
      return NextResponse.json({ code: 0 });
    }

    // on_publish → 방송 시작 (시청 기록 초기화)
    await prisma.bjViewLog.deleteMany({ where: { bjProfileId: profile.id } });
    await prisma.bjProfile.update({ where: { id: profile.id }, data: { isLive: true, liveStartedAt: new Date(), viewCount: 0, liveViewers: 0 } });
    return NextResponse.json({ code: 0 });
  } catch (err) {
    console.error("[stream auth error]", err);
    return NextResponse.json({ code: 1, error: "server error" });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stream = searchParams.get("stream") || "";
  const action = searchParams.get("action") || "";
  const streamKey = stream.replace(/^\/live\//, "").replace(/^live\//, "");

  if (!streamKey) return NextResponse.json({ code: 1 });

  const profile = await prisma.bjProfile.findUnique({ where: { streamKey } });
  if (!profile) return NextResponse.json({ code: 1 });

  if (action === "on_unpublish" || action === "stop") {
    await prisma.bjProfile.update({ where: { id: profile.id }, data: { isLive: false } });
  }

  return NextResponse.json({ code: 0 });
}

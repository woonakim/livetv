export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// SRS HTTP API 프록시 — BJ 본인 스트림의 incoming bitrate 조회
// 회선 불안정 경고용 (BJ 대시보드)
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const profile = await prisma.bjProfile.findUnique({ where: { userId: session.id } });
  if (!profile) return NextResponse.json({ error: "BJ 프로필 없음" }, { status: 404 });

  try {
    const res = await fetch("http://127.0.0.1:1985/api/v1/streams/", {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return NextResponse.json({ live: false, recvKbps: 0 });
    const data = await res.json();
    const streams: { name: string; publish?: { active?: boolean }; kbps?: { recv_30s?: number }; video?: { width?: number; height?: number; codec?: string }; audio?: { codec?: string } }[] = Array.isArray(data?.streams) ? data.streams : [];
    const mine = streams.find(s => s.name === profile.streamKey);
    if (!mine) return NextResponse.json({ live: false, recvKbps: 0 });
    return NextResponse.json({
      live: !!mine.publish?.active,
      recvKbps: mine.kbps?.recv_30s ?? 0,
      width: mine.video?.width ?? 0,
      height: mine.video?.height ?? 0,
      videoCodec: mine.video?.codec ?? "",
      audioCodec: mine.audio?.codec ?? "",
    });
  } catch {
    return NextResponse.json({ live: false, recvKbps: 0 });
  }
}

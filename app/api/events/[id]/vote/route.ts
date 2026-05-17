export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { grantReward } from "@/lib/reward";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;
  const eventId = Number(id);
  const { pick } = await req.json();

  if (!pick || !["A", "B", "DRAW"].includes(pick)) {
    return NextResponse.json({ error: "잘못된 투표입니다." }, { status: 400 });
  }

  // 마감 체크
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
  if (new Date() > event.deadline) {
    return NextResponse.json({ error: "투표가 마감되었습니다." }, { status: 400 });
  }
  // 무승부 베팅은 allowDraw=true 일 때만
  if (pick === "DRAW" && !event.allowDraw) {
    return NextResponse.json({ error: "이 이벤트는 무승부 베팅을 지원하지 않습니다." }, { status: 400 });
  }

  // 중복 투표 체크
  const existing = await prisma.eventVote.findUnique({
    where: { eventId_userId: { eventId, userId: session.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "이미 투표하셨습니다." }, { status: 400 });
  }

  await prisma.eventVote.create({
    data: { eventId, userId: session.id, pick },
  });

  await grantReward(session.id, "event_join", `이벤트 참여: ${event.title}`);

  return NextResponse.json({ ok: true, pick });
}

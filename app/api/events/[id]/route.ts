import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id: Number(id) },
    include: {
      votes: { select: { pick: true } },
      _count: { select: { votes: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 조회수 증가
  await prisma.event.update({ where: { id: Number(id) }, data: { viewCount: { increment: 1 } } });

  // 현재 유저 투표 여부
  let myPick: string | null = null;
  const session = await getSession(req);
  if (session) {
    const vote = await prisma.eventVote.findUnique({
      where: { eventId_userId: { eventId: Number(id), userId: session.id } },
    });
    myPick = vote?.pick ?? null;
  }

  // 투표 집계
  const teamACnt = event.votes.filter(v => v.pick === "A").length;
  const teamBCnt = event.votes.filter(v => v.pick === "B").length;

  return NextResponse.json({
    ...event,
    viewCount: event.viewCount + 1,
    myPick,
    teamAVotes: teamACnt,
    teamBVotes: teamBCnt,
    totalVotes: teamACnt + teamBCnt,
  });
}

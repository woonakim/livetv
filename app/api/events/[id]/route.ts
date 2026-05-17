export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, defaultReward] = await Promise.all([
    prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        votes: { select: { pick: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.activityReward.findUnique({ where: { activityKey: "event_correct" }, select: { points: true, isActive: true } }),
  ]);
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

  // 투표 집계 (무승부 포함)
  const teamACnt = event.votes.filter(v => v.pick === "A").length;
  const teamBCnt = event.votes.filter(v => v.pick === "B").length;
  const drawCnt = event.votes.filter(v => v.pick === "DRAW").length;

  const defaultPoints = defaultReward?.isActive ? (defaultReward.points || 0) : 0;
  const effectiveRewardPoints = (event.rewardPoints !== null && event.rewardPoints > 0) ? event.rewardPoints : defaultPoints;

  return NextResponse.json({
    ...event,
    viewCount: event.viewCount + 1,
    myPick,
    teamAVotes: teamACnt,
    teamBVotes: teamBCnt,
    drawVotes: drawCnt,
    totalVotes: teamACnt + teamBCnt + drawCnt,
    effectiveRewardPoints,
  });
}

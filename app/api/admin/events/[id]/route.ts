export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      votes: { orderBy: { createdAt: "desc" } },
      _count: { select: { votes: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 투표자 닉네임 조인
  const userIds = Array.from(new Set(event.votes.map(v => v.userId)));
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, nickname: true, username: true } })
    : [];
  const uMap = new Map(users.map(u => [u.id, u]));

  const voters = event.votes.map(v => ({
    id: v.id,
    userId: v.userId,
    nickname: uMap.get(v.userId)?.nickname || `#${v.userId}`,
    username: uMap.get(v.userId)?.username || "",
    pick: v.pick,
    isCorrect: v.isCorrect,
    createdAt: v.createdAt.toISOString(),
  }));

  const votesA = event.votes.filter(v => v.pick === "A").length;
  const votesB = event.votes.filter(v => v.pick === "B").length;
  const votesDraw = event.votes.filter(v => v.pick === "DRAW").length;
  return NextResponse.json({ ...event, votesA, votesB, votesDraw, voters });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = parseInt(params.id);
  const data: Record<string, unknown> = {};
  for (const key of ["title", "content", "bannerImg", "bottomImg", "teamA", "teamB", "betType", "betLine", "reward"]) {
    if (body[key] !== undefined) data[key] = key === "content" ? sanitize(body[key]) : body[key];
  }
  if (body.deadline) {
    // datetime-local 입력 (Z/+오프셋 없음) → KST로 간주해 +09:00 부여
    const s: string = body.deadline;
    data.deadline = (s.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) ? new Date(s) : new Date(s + "+09:00");
  }
  if (body.isActive !== undefined) data.isActive = body.isActive;
  // betType이 변경되었거나 allowDraw가 명시되었으면 처리 — 승무패면 자동 true
  if (body.betType !== undefined && body.allowDraw === undefined) {
    data.allowDraw = body.betType === "승무패";
  } else if (body.allowDraw !== undefined) {
    data.allowDraw = !!body.allowDraw;
  }
  // 수동 보상 모드 — null이면 기본 보상 사용, 숫자면 그 값으로 지급
  if (body.rewardPoints !== undefined) {
    data.rewardPoints = (typeof body.rewardPoints === "number" && body.rewardPoints >= 0) ? body.rewardPoints : null;
  }
  const updated = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.event.delete({ where: { id: parseInt(params.id) } });
  return NextResponse.json({ ok: true });
}

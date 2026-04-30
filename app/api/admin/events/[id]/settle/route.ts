export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { grantReward } from "@/lib/reward";
import { adminLog } from "@/lib/admin-log";

// 이벤트 정산 — 결과 입력 → 정답자에게 event_correct 보상 + 연승 streak 갱신 + 임계치 도달 시 추가 보상
//
// 동시성 안전:
// 1) event.updateMany({where: {settledAt: null}}) 로 정산 권한 atomic 획득 (count===0이면 다른 admin이 이미 처리)
// 2) eventVote.updateMany({where: {isCorrect: null}}) 로 vote 처리 권한 atomic 획득 (재실행 방지)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { id } = await params;
  const eventId = Number(id);
  if (!eventId) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const body = await req.json();
  const winnerSide: string = body.winnerSide;
  if (!["A", "B", "DRAW"].includes(winnerSide)) {
    return NextResponse.json({ error: "winnerSide는 A/B/DRAW 중 하나여야 합니다." }, { status: 400 });
  }

  // 정산 권한 atomic 획득 — 이미 settled면 count=0
  const claim = await prisma.event.updateMany({
    where: { id: eventId, settledAt: null },
    data: { winnerSide, settledAt: new Date() },
  });
  if (claim.count === 0) {
    const existing = await prisma.event.findUnique({ where: { id: eventId } });
    if (!existing) return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ error: "이미 정산된 이벤트입니다." }, { status: 409 });
  }
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return NextResponse.json({ error: "이벤트를 찾을 수 없습니다." }, { status: 404 });

  const streakSettings = await prisma.eventStreakSetting.findMany({ where: { isActive: true }, orderBy: { threshold: "asc" } });
  const streakMap = new Map(streakSettings.map(s => [s.threshold, s]));

  // votes 조회 — isCorrect=null 인 것만 (이미 처리된 vote 재처리 방지)
  const votes = await prisma.eventVote.findMany({ where: { eventId, isCorrect: null } });

  let correctCount = 0;
  for (const v of votes) {
    const isCorrect = winnerSide === "DRAW" ? null : v.pick === winnerSide;

    // vote 처리 atomic 획득 (다른 동시 정산이 이미 처리했으면 skip)
    const claimVote = await prisma.eventVote.updateMany({
      where: { id: v.id, isCorrect: null },
      data: { isCorrect },
    });
    if (claimVote.count === 0) continue;

    // 무승부는 연승 영향 없음 (취소 처리)
    if (winnerSide === "DRAW") continue;

    if (isCorrect) {
      correctCount++;
      await grantReward(v.userId, "event_correct", `이벤트 적중: ${event.title}`);

      // 연승 streak ++ (atomic)
      const updated = await prisma.user.update({
        where: { id: v.userId },
        data: { eventStreak: { increment: 1 } },
        select: { eventStreak: true, eventBestStreak: true },
      });
      if (updated.eventStreak > updated.eventBestStreak) {
        await prisma.user.update({
          where: { id: v.userId },
          data: { eventBestStreak: updated.eventStreak },
        });
      }

      // 임계치 도달 보상 (정확히 newStreak에 해당하는 단계)
      const matched = streakMap.get(updated.eventStreak);
      if (matched && (matched.points > 0 || matched.exp > 0)) {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: v.userId },
            data: { points: { increment: matched.points }, exp: { increment: matched.exp } },
          }),
          prisma.pointLog.create({
            data: { userId: v.userId, type: "EARN", amount: matched.points, reason: `이벤트 ${updated.eventStreak}연승 보너스` },
          }),
        ]);
      }
    } else {
      // 오답 → streak 0
      await prisma.user.update({
        where: { id: v.userId },
        data: { eventStreak: 0 },
      });
    }
  }

  await adminLog({ action: "event.settle", target: `eventId:${eventId}`, detail: { winnerSide, totalVotes: votes.length, correctCount } });

  return NextResponse.json({ ok: true, totalVotes: votes.length, correctCount, winnerSide });
}

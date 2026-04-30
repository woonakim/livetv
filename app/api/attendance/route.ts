export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { grantReward } from "@/lib/reward";
import { todayDateKST, yesterdayDateKST, startOfMonthKST, endOfMonthKST } from "@/lib/date-kr";

// GET: 이번 달 출석 기록 조회
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const startOfMonth = startOfMonthKST();
  const endOfMonth = endOfMonthKST();

  const records = await prisma.attendance.findMany({
    where: {
      userId: session.id,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    orderBy: { date: "asc" },
  });

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { points: true, exp: true } });

  // 보상 설정값 가져오기
  const rewardSettings = await prisma.activityReward.findMany({
    where: { activityKey: { startsWith: "attendance" }, isActive: true },
    select: { activityKey: true, points: true, exp: true },
  });
  const rewardMap: Record<string, { points: number; exp: number }> = {};
  for (const r of rewardSettings) rewardMap[r.activityKey] = { points: r.points, exp: r.exp };

  return NextResponse.json({
    records: records.map(r => ({
      date: r.date.toISOString().slice(0, 10),
      points: r.points,
      streak: r.streak,
    })),
    totalPoints: user?.points ?? 0,
    totalExp: user?.exp ?? 0,
    currentStreak: records.length > 0 ? records[records.length - 1].streak : 0,
    rewards: rewardMap,
  });
}

// POST: 오늘 출석 체크
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const today = todayDateKST();

  // 중복 체크
  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.id, date: today } },
  });
  if (existing) {
    return NextResponse.json({ error: "오늘은 이미 출석했습니다" }, { status: 400 });
  }

  // 어제 출석 확인 → 연속 출석 계산
  const yesterday = yesterdayDateKST();
  const yesterdayRecord = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.id, date: yesterday } },
  });
  const streak = yesterdayRecord ? yesterdayRecord.streak + 1 : 1;

  // 출석 보상
  const reward = await grantReward(session.id, "attendance", `출석체크 (${streak}일 연속)`);
  const points = reward?.points ?? 0;

  // 연속 출석 보너스
  const bonuses: { streak: number; key: string; label: string }[] = [
    { streak: 3, key: "attendance_3", label: "3일 연속 출석 보너스" },
    { streak: 7, key: "attendance_7", label: "7일 연속 출석 보너스" },
    { streak: 14, key: "attendance_14", label: "14일 연속 출석 보너스" },
    { streak: 30, key: "attendance_30", label: "30일 연속 출석 보너스" },
  ];
  let bonusPoints = 0;
  let bonusExp = 0;
  for (const b of bonuses) {
    if (streak === b.streak) {
      const br = await grantReward(session.id, b.key, b.label);
      if (br) { bonusPoints += br.points; bonusExp += br.exp; }
    }
  }

  // 출석 기록 저장
  await prisma.attendance.create({
    data: { userId: session.id, date: today, points, streak },
  });

  return NextResponse.json({
    ok: true,
    points,
    exp: reward?.exp ?? 0,
    bonusPoints,
    bonusExp,
    streak,
  });
}

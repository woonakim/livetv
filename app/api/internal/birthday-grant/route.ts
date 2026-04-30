export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grantReward } from "@/lib/reward";
import { calcLevel } from "@/lib/level";
import { isInternalAuthorized } from "@/lib/internal-auth";

// 매일 0시 cron이 호출하는 내부 엔드포인트
// - SiteSetting.birthdayBonusEnabled = true 일 때만 동작 (전체 ON/OFF 마스터)
// - 유저의 현재 레벨에 LevelSetting.birthdayBonusEnabled = true 일 때만 지급
// - lastBirthdayBonusYear !== 올해
// - 평년의 2/29 생일은 2/28에 지급
export async function POST(req: NextRequest) {
  if (!isInternalAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const setting = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!setting?.birthdayBonusEnabled) return NextResponse.json({ ok: true, skipped: "disabled" });

  // KST 기준 오늘 month/day
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const todayMonth = kst.getUTCMonth() + 1;
  const todayDay = kst.getUTCDate();
  const todayYear = kst.getUTCFullYear();

  // 윤년 체크
  const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const isLeapToday = isLeapYear(todayYear);

  const levelRows = await prisma.levelSetting.findMany({
    select: { level: true, requiredExp: true, birthdayBonusEnabled: true },
    orderBy: { level: "asc" },
  });
  // 레벨 -> birthdayBonusEnabled 맵
  const levelBdayMap = new Map(levelRows.map(l => [l.level, l.birthdayBonusEnabled]));

  // 오늘 생일자 (해당 month/day) + 평년 2/28일 때 2/29 생일자도 포함
  const candidates = await prisma.user.findMany({
    where: { birthDate: { not: null }, isActive: true },
    select: { id: true, exp: true, birthDate: true, lastBirthdayBonusYear: true, nickname: true },
  });

  let granted = 0, skipped = 0;
  for (const u of candidates) {
    if (!u.birthDate) continue;
    const bd = u.birthDate;
    const bMonth = bd.getUTCMonth() + 1;
    const bDay = bd.getUTCDate();

    let isBirthday = bMonth === todayMonth && bDay === todayDay;
    if (!isBirthday && !isLeapToday && todayMonth === 2 && todayDay === 28 && bMonth === 2 && bDay === 29) {
      isBirthday = true;
    }
    if (!isBirthday) continue;

    if (u.lastBirthdayBonusYear === todayYear) { skipped++; continue; }

    const userLevel = calcLevel(u.exp, levelRows);
    // 유저의 레벨이 birthdayBonusEnabled=true인지 확인
    if (!levelBdayMap.get(userLevel)) { skipped++; continue; }

    const r = await grantReward(u.id, "birthday", `생일 축하 보상 (${u.nickname})`);
    if (r) {
      await prisma.user.update({ where: { id: u.id }, data: { lastBirthdayBonusYear: todayYear } });
      granted++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, granted, skipped, todayKst: `${todayMonth}/${todayDay}` });
}

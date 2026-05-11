import { adminLog } from "@/lib/admin-log";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";


export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  // 화면 표시 / API 키
  for (const k of [
    "showLogoBroadcast","showLogoMain","showLogoAnalysis","showLogoYoutube",
    "anthropicApiKey","anthropicEnabled","openaiApiKey","openaiEnabled",
    "geminiApiKey","geminiEnabled","gnewsApiKey","youtubeApiKey",
    "levelDisplayMode","noticeTicker","adminAlarmSound",
    // 가입 시 수집 토글
    "collectBirthDateOnSignup","collectPhoneOnSignup",
    // 생일 보상
    "birthdayBonusEnabled","birthdayMinLevel",
    // 교환 락업
    "exchangeMinLevel","exchangeLockEnabled",
    // 분석글 일반 유저
    "allowUserAnalysis","analysisRewardDailyLimit",
    // 채팅 캡
    "chatRewardDailyPointCap","chatRewardDailyExpCap",
    "chatMinLength","chatMinLengthEnabled","chatDuplicateBlockEnabled",
    // 텔레그램 알림
    "telegramBotToken","telegramSubscribePasscode","telegramNotifyEnabled",
    // 가짜 공개채팅 시청자
    "fakeViewersChatEnabled","fakeViewersChatMin","fakeViewersChatMax",
    // 분석글 가짜 조회수 전역 default
    "fakeViewsAnalysisEnabled","fakeViewsAnalysisTargetMin","fakeViewsAnalysisTargetMax","fakeViewsAnalysisRampHours",
    // 이벤트매치 자동 마감
    "autoCloseEventsEnabled",
  ]) {
    if (body[k] !== undefined) data[k] = body[k];
  }

  await prisma.siteSetting.update({ where: { id: 1 }, data });
  await adminLog({ action: "site.settings.update", detail: body });
  return NextResponse.json({ ok: true });
}

export { PATCH as PUT };

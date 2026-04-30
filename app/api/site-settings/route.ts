export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


// GET: 공개 설정 조회 (API 키는 제외)
export async function GET() {
  // upsert로 row가 항상 존재하도록 보장 (서버/클라 fallback 불일치 방지)
  const settings = await prisma.siteSetting.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return NextResponse.json({
    showLogoBroadcast: settings.showLogoBroadcast,
    showLogoMain: settings.showLogoMain,
    showLogoAnalysis: settings.showLogoAnalysis,
    showLogoYoutube: settings.showLogoYoutube,
    anthropicEnabled: settings.anthropicEnabled,
    openaiEnabled: settings.openaiEnabled,
    geminiEnabled: settings.geminiEnabled,
    levelDisplayMode: settings.levelDisplayMode,
    noticeTicker: settings.noticeTicker,
    adminAlarmSound: settings.adminAlarmSound,
    // 가입 시 수집 / 분석글 / 교환 락업 (공개)
    collectBirthDateOnSignup: settings.collectBirthDateOnSignup,
    collectPhoneOnSignup: settings.collectPhoneOnSignup,
    allowUserAnalysis: settings.allowUserAnalysis,
    exchangeMinLevel: settings.exchangeMinLevel,
    exchangeLockEnabled: settings.exchangeLockEnabled,
  });
}

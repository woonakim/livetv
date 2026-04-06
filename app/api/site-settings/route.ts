export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


// GET: 공개 설정 조회 (API 키는 제외)
export async function GET() {
  const settings = await prisma.siteSetting.findUnique({ where: { id: 1 } });
  if (!settings) return NextResponse.json({ showLogoBroadcast: true, showLogoMain: true, showLogoAnalysis: true, showLogoYoutube: true, anthropicEnabled: false, openaiEnabled: false, geminiEnabled: false });
  return NextResponse.json({
    showLogoBroadcast: settings.showLogoBroadcast,
    showLogoMain: settings.showLogoMain,
    showLogoAnalysis: settings.showLogoAnalysis,
    showLogoYoutube: settings.showLogoYoutube,
    anthropicEnabled: settings.anthropicEnabled,
    openaiEnabled: settings.openaiEnabled,
    geminiEnabled: settings.geminiEnabled,
    levelDisplayMode: settings.levelDisplayMode,
  });
}

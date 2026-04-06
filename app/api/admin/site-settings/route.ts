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
  const data: Record<string, boolean> = {};
  if (body.showLogoBroadcast !== undefined) data.showLogoBroadcast = body.showLogoBroadcast;
  if (body.showLogoMain !== undefined) data.showLogoMain = body.showLogoMain;
  if (body.showLogoAnalysis !== undefined) data.showLogoAnalysis = body.showLogoAnalysis;
  if (body.showLogoYoutube !== undefined) data.showLogoYoutube = body.showLogoYoutube;
  if (body.anthropicApiKey !== undefined) data.anthropicApiKey = body.anthropicApiKey;
  if (body.anthropicEnabled !== undefined) data.anthropicEnabled = body.anthropicEnabled;
  if (body.openaiApiKey !== undefined) data.openaiApiKey = body.openaiApiKey;
  if (body.openaiEnabled !== undefined) data.openaiEnabled = body.openaiEnabled;
  if (body.geminiApiKey !== undefined) data.geminiApiKey = body.geminiApiKey;
  if (body.geminiEnabled !== undefined) data.geminiEnabled = body.geminiEnabled;
  if (body.gnewsApiKey !== undefined) data.gnewsApiKey = body.gnewsApiKey;
  if (body.youtubeApiKey !== undefined) data.youtubeApiKey = body.youtubeApiKey;
  if (body.levelDisplayMode !== undefined) data.levelDisplayMode = body.levelDisplayMode;

  await prisma.siteSetting.update({ where: { id: 1 }, data });
  return NextResponse.json({ ok: true });
}

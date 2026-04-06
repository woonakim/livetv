export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// GET: BJ 채팅 설정 (배너, 고정메시지, 시스템메시지) + 매니저 여부
export async function GET(req: NextRequest) {
  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  if (!bjId) return NextResponse.json({});

  const profile = await prisma.bjProfile.findUnique({
    where: { id: bjId },
    select: {
      userId: true,
      bannerUrl: true,
      bannerText: true,
      pinnedMessage: true,
      systemMessages: true,
    },
  });

  if (!profile) return NextResponse.json({});

  let systemMessages = [];
  try { systemMessages = JSON.parse(profile.systemMessages || "[]"); } catch { /* empty */ }

  // 현재 유저가 매니저인지 확인
  let isManager = false;
  let isBjOwner = false;
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (session) {
    isBjOwner = profile.userId === session.id;
    const manager = await prisma.bjChatManager.findUnique({
      where: { bjProfileId_userId: { bjProfileId: bjId, userId: session.id } },
    });
    isManager = !!manager;
  }

  return NextResponse.json({
    bannerUrl: profile.bannerUrl,
    bannerText: profile.bannerText,
    pinnedMessage: profile.pinnedMessage,
    systemMessages,
    isManager,
    isBjOwner,
  });
}

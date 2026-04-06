export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// POST: 메시지 고정/해제
export async function POST(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { msgId, pin } = await req.json();
  if (!msgId) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const message = await prisma.bjChatMessage.findUnique({ where: { id: msgId } });
  if (!message) return NextResponse.json({ error: "메시지 없음" }, { status: 404 });

  // 권한 확인: 관리자, BJ 본인, 매니저
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: message.bjProfileId } });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile?.userId === session.id;
  const isManager = bjProfile ? await prisma.bjChatManager.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjProfile.id, userId: session.id } },
  }) : null;
  if (!isAdmin && !isBjOwner && !isManager) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  if (pin) {
    // 기존 고정 해제 후 새로 고정
    await prisma.bjChatMessage.updateMany({
      where: { bjProfileId: message.bjProfileId, isPinned: true },
      data: { isPinned: false },
    });
  }

  await prisma.bjChatMessage.update({
    where: { id: msgId },
    data: { isPinned: !!pin },
  });

  return NextResponse.json({ ok: true });
}

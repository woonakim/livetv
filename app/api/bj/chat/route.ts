export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// GET: BJ 채팅 메시지 조회
export async function GET(req: NextRequest) {
  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  if (!bjId) return NextResponse.json({ messages: [], pinnedMsg: null });

  const [messages, pinnedMsg] = await Promise.all([
    prisma.bjChatMessage.findMany({
      where: { bjProfileId: bjId },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.bjChatMessage.findFirst({
      where: { bjProfileId: bjId, isPinned: true },
    }),
  ]);

  return NextResponse.json({ messages, pinnedMsg });
}

// POST: BJ 채팅 메시지 전송
export async function POST(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { bjId, text, isSystem } = await req.json();
  if (!bjId || !text?.trim() || text.trim().length > 200) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  // 시스템 메시지: BJ 본인/관리자만 가능
  if (isSystem) {
    const sysUser = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
    const isAdmin = sysUser?.role === "ADMIN" || sysUser?.role === "SUPERADMIN";
    const isBjOwner = bjProfile?.userId === session.id;
    if (!isAdmin && !isBjOwner) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

    const msg = await prisma.bjChatMessage.create({
      data: { bjProfileId: bjId, nickname: "시스템", role: "USER", level: 0, text: text.trim() },
    });
    return NextResponse.json(msg, { status: 201 });
  }

  // 차단 확인
  const ban = await prisma.bjChatBan.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: session.id } },
  });
  if (ban) return NextResponse.json({ error: "채팅이 차단되었습니다" }, { status: 403 });

  // DB에서 최신 role + exp 가져오기
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true, nickname: true, exp: true } });

  // 레벨 계산
  const levelSettings = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  let userLevel = 0;
  for (const s of levelSettings) {
    if ((user?.exp || 0) >= s.requiredExp) userLevel = s.level;
    else break;
  }

  const msg = await prisma.bjChatMessage.create({
    data: {
      bjProfileId: bjId,
      userId: session.id,
      nickname: user?.nickname || session.nickname,
      role: (user?.role || "USER") as "USER" | "PICKSTER" | "BJ" | "ADMIN" | "SUPERADMIN",
      level: userLevel,
      text: text.trim(),
    },
  });

  return NextResponse.json(msg, { status: 201 });
}

// DELETE: 메시지 삭제 (관리자/BJ)
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const msgId = parseInt(req.nextUrl.searchParams.get("msgId") || "0");
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

  await prisma.bjChatMessage.delete({ where: { id: msgId } });
  return NextResponse.json({ ok: true });
}

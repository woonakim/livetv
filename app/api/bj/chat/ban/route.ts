export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// POST: 채팅 차단
export async function POST(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { bjId, userId, nickname } = await req.json();
  if (!bjId || !userId) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  // 권한 확인: ADMIN/SUPERADMIN 또는 해당 BJ 본인 또는 매니저
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
  if (!bjProfile) return NextResponse.json({ error: "BJ 없음" }, { status: 404 });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile.userId === session.id;
  const isManager = await prisma.bjChatManager.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: session.id } },
  });
  if (!isAdmin && !isBjOwner && !isManager) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await prisma.bjChatBan.upsert({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId } },
    create: { bjProfileId: bjId, userId, nickname: nickname || "" },
    update: {},
  });

  return NextResponse.json({ ok: true });
}

// DELETE: 차단 해제
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0");
  if (!bjId || !userId) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
  if (!bjProfile) return NextResponse.json({ error: "BJ 없음" }, { status: 404 });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile.userId === session.id;
  const isManager = await prisma.bjChatManager.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: session.id } },
  });
  if (!isAdmin && !isBjOwner && !isManager) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await prisma.bjChatBan.deleteMany({ where: { bjProfileId: bjId, userId } });
  return NextResponse.json({ ok: true });
}

// GET: 차단 목록
export async function GET(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  if (!bjId) return NextResponse.json([]);

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
  if (!bjProfile) return NextResponse.json([]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile.userId === session.id;
  const isManager = await prisma.bjChatManager.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: session.id } },
  });
  if (!isAdmin && !isBjOwner && !isManager) return NextResponse.json([]);

  const bans = await prisma.bjChatBan.findMany({
    where: { bjProfileId: bjId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bans);
}

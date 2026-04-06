export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// POST: 매니저 지정
export async function POST(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { bjId, nickname: targetNickname } = await req.json();
  if (!bjId || !targetNickname) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  // 권한 확인: ADMIN/SUPERADMIN 또는 해당 BJ 본인
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
  if (!bjProfile) return NextResponse.json({ error: "BJ 없음" }, { status: 404 });

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile.userId === session.id;
  if (!isAdmin && !isBjOwner) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  // 닉네임으로 유저 찾기
  const targetUser = await prisma.user.findUnique({ where: { nickname: targetNickname } });
  if (!targetUser) return NextResponse.json({ error: "존재하지 않는 닉네임입니다" }, { status: 404 });

  await prisma.bjChatManager.upsert({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: targetUser.id } },
    create: { bjProfileId: bjId, userId: targetUser.id, nickname: targetNickname },
    update: { nickname: targetNickname },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: 매니저 해제
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
  if (!isAdmin && !isBjOwner) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  await prisma.bjChatManager.deleteMany({ where: { bjProfileId: bjId, userId } });
  return NextResponse.json({ ok: true });
}

// GET: 매니저 목록
export async function GET(req: NextRequest) {
  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  if (!bjId) return NextResponse.json([]);

  const managers = await prisma.bjChatManager.findMany({
    where: { bjProfileId: bjId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(managers);
}

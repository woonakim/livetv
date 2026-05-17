export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

async function checkPermission(bjId: number, sessionUserId: number) {
  const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { role: true } });
  const bjProfile = await prisma.bjProfile.findUnique({ where: { id: bjId } });
  if (!bjProfile) return { ok: false as const, error: "BJ 없음", status: 404 };
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isBjOwner = bjProfile.userId === sessionUserId;
  const isManager = await prisma.bjChatManager.findUnique({
    where: { bjProfileId_userId: { bjProfileId: bjId, userId: sessionUserId } },
  });
  if (!isAdmin && !isBjOwner && !isManager) return { ok: false as const, error: "권한 없음", status: 403 };
  return { ok: true as const };
}

// POST: 채팅 차단 — 회원: { bjId, userId, nickname } / 비회원: { bjId, guestId, nickname }
export async function POST(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const { bjId, userId, guestId, nickname } = await req.json();
  if (!bjId || (!userId && !guestId)) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const perm = await checkPermission(bjId, session.id);
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

  if (userId) {
    await prisma.bjChatBan.upsert({
      where: { bjProfileId_userId: { bjProfileId: bjId, userId } },
      create: { bjProfileId: bjId, userId, nickname: nickname || "" },
      update: {},
    });
  } else {
    // 비회원 차단 — userId=0 자리표시자 + guestId
    await prisma.bjChatBan.upsert({
      where: { bjProfileId_guestId: { bjProfileId: bjId, guestId } },
      create: { bjProfileId: bjId, userId: 0, guestId, nickname: nickname || "" },
      update: {},
    });
  }
  return NextResponse.json({ ok: true });
}

// DELETE: 차단 해제 — ?bjId=&userId= 또는 ?bjId=&guestId=
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  const userId = parseInt(req.nextUrl.searchParams.get("userId") || "0");
  const guestId = req.nextUrl.searchParams.get("guestId") || "";
  if (!bjId || (!userId && !guestId)) return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });

  const perm = await checkPermission(bjId, session.id);
  if (!perm.ok) return NextResponse.json({ error: perm.error }, { status: perm.status });

  if (userId) {
    await prisma.bjChatBan.deleteMany({ where: { bjProfileId: bjId, userId } });
  } else {
    await prisma.bjChatBan.deleteMany({ where: { bjProfileId: bjId, guestId } });
  }
  return NextResponse.json({ ok: true });
}

// GET: 차단 목록
export async function GET(req: NextRequest) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const bjId = parseInt(req.nextUrl.searchParams.get("bjId") || "0");
  if (!bjId) return NextResponse.json([]);

  const perm = await checkPermission(bjId, session.id);
  if (!perm.ok) return NextResponse.json([]);

  const bans = await prisma.bjChatBan.findMany({
    where: { bjProfileId: bjId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bans);
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

// GET: BJ 목록
export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const profiles = await prisma.bjProfile.findMany({
    include: { user: { select: { id: true, nickname: true, username: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(profiles.map(p => ({
    id: p.id,
    userId: p.userId,
    nickname: p.user.nickname,
    username: p.user.username,
    role: p.user.role,
    streamKey: p.streamKey,
    title: p.title,
    avatar: p.avatar,
    avatarType: p.avatarType,
    isLive: p.isLive,
    isApproved: p.isApproved,
    isActive: p.isActive,
    viewCount: p.viewCount,
    createdAt: p.createdAt.toISOString(),
  })));
}

// PATCH: BJ 승인/거절/설정 변경
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const { id, isApproved, isActive, regenerateKey, avatar, avatarType } = body;
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (isApproved !== undefined) data.isApproved = isApproved;
  if (isActive !== undefined) data.isActive = isActive;
  if (avatar !== undefined) data.avatar = avatar;
  if (avatarType !== undefined) data.avatarType = avatarType;
  if (regenerateKey) data.streamKey = `bj_${crypto.randomBytes(12).toString("hex")}`;

  // 승인 시 유저 role을 BJ로 변경
  if (isApproved === true) {
    const profile = await prisma.bjProfile.findUnique({ where: { id } });
    if (profile) {
      await prisma.user.update({ where: { id: profile.userId }, data: { role: "BJ" } });
    }
  }

  await prisma.bjProfile.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

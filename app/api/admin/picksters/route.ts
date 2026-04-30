export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";


// GET: 픽스터 신청 목록 (관리자)
export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const profiles = await prisma.picksterProfile.findMany({
    include: { user: { select: { id: true, nickname: true, role: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(profiles.map(p => ({
    id: p.id,
    userId: p.userId,
    nickname: p.user.nickname,
    role: p.user.role,
    avatar: p.avatar,
    sport: p.sport,
    intro: p.intro,
    tier: p.tier,
    monthlyFee: p.monthlyFee,
    isApproved: p.isApproved,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  })));
}

// PATCH: 픽스터 승인/거절/티어변경 (관리자)
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const { id, isApproved, isActive, tier } = body;

  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (isApproved !== undefined) data.isApproved = isApproved;
  if (isActive !== undefined) data.isActive = isActive;
  if (tier !== undefined) data.tier = tier;

  // 승인 시 유저 role을 PICKSTER로 변경
  if (isApproved === true) {
    const profile = await prisma.picksterProfile.findUnique({ where: { id } });
    if (profile) {
      await prisma.user.update({ where: { id: profile.userId }, data: { role: "PICKSTER" } });
    }
  }

  await prisma.picksterProfile.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

// DELETE: 픽스터 프로필 삭제 (거절/취소/삭제 공용)
// 옵션: ?demote=1 → 유저 role이 PICKSTER면 USER로 강등 (관리자 강등 안 함)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const id = parseInt(req.nextUrl.searchParams.get("id") || "0");
  const demote = req.nextUrl.searchParams.get("demote") === "1";
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const profile = await prisma.picksterProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "픽스터 프로필을 찾을 수 없습니다." }, { status: 404 });

  await prisma.picksterProfile.delete({ where: { id } });

  if (demote) {
    await prisma.user.updateMany({
      where: { id: profile.userId, role: "PICKSTER" },
      data: { role: "USER" },
    });
  }

  return NextResponse.json({ ok: true });
}

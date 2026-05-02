export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import crypto from "crypto";
import { adminLog } from "@/lib/admin-log";

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
    fakeViewersEnabled: p.fakeViewersEnabled,
    fakeViewersMin: p.fakeViewersMin,
    fakeViewersMax: p.fakeViewersMax,
    fakeViewersRampSec: p.fakeViewersRampSec,
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
  const { id, isApproved, isActive, regenerateKey, avatar, avatarType, fakeViewersEnabled, fakeViewersMin, fakeViewersMax, fakeViewersRampSec } = body;
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (isApproved !== undefined) data.isApproved = isApproved;
  if (isActive !== undefined) data.isActive = isActive;
  if (avatar !== undefined) data.avatar = avatar;
  if (avatarType !== undefined) data.avatarType = avatarType;
  if (regenerateKey) data.streamKey = `bj_${crypto.randomBytes(12).toString("hex")}`;
  // 가짜 시청자 — SUPERADMIN만 변경 가능
  const touchesFakeViewers = [fakeViewersEnabled, fakeViewersMin, fakeViewersMax, fakeViewersRampSec].some(v => v !== undefined);
  if (touchesFakeViewers) {
    if (session.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "가짜 시청자 설정은 최고 관리자만 변경 가능합니다." }, { status: 403 });
    }
    if (fakeViewersEnabled !== undefined) data.fakeViewersEnabled = !!fakeViewersEnabled;
    if (fakeViewersMin !== undefined) data.fakeViewersMin = Math.max(0, parseInt(fakeViewersMin) || 0);
    if (fakeViewersMax !== undefined) data.fakeViewersMax = Math.max(0, parseInt(fakeViewersMax) || 0);
    if (fakeViewersRampSec !== undefined) data.fakeViewersRampSec = Math.max(1, parseInt(fakeViewersRampSec) || 600);
  }

  // 승인 시 유저 role을 BJ로 변경 (단, ADMIN/SUPERADMIN은 강등하지 않음)
  if (isApproved === true) {
    const profile = await prisma.bjProfile.findUnique({ where: { id } });
    if (profile) {
      await prisma.user.updateMany({
        where: { id: profile.userId, role: { in: ["USER", "PICKSTER"] } },
        data: { role: "BJ" },
      });
    }
  }

  await prisma.bjProfile.update({ where: { id }, data });
  await adminLog({ action: "bj.update", target: `bjProfileId:${id}`, detail: body });
  return NextResponse.json({ ok: true });
}

// DELETE: BJ 프로필 삭제 (거절/취소/삭제 공용)
// 옵션: ?demote=1 → 유저 role이 BJ면 USER로 강등 (관리자 강등 안 함)
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const id = parseInt(req.nextUrl.searchParams.get("id") || "0");
  const demote = req.nextUrl.searchParams.get("demote") === "1";
  if (!id) return NextResponse.json({ error: "ID 필요" }, { status: 400 });

  const profile = await prisma.bjProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "BJ 프로필을 찾을 수 없습니다." }, { status: 404 });

  await prisma.bjProfile.delete({ where: { id } });

  if (demote) {
    // 강등 대상은 BJ만, ADMIN/SUPERADMIN은 보존
    await prisma.user.updateMany({
      where: { id: profile.userId, role: "BJ" },
      data: { role: "USER" },
    });
  }

  await adminLog({ action: "bj.delete", target: `bjProfileId:${id}`, detail: { demote, userId: profile.userId } });
  return NextResponse.json({ ok: true });
}

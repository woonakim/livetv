export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { adminLog } from "@/lib/admin-log";
import { calculateLevel, calculateSuspicionScore, getReferralPyramid } from "@/lib/admin-user-helpers";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = parseInt(params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, nickname: true, role: true,
      points: true, exp: true, isActive: true,
      name: true, phone: true, phoneVerified: true, email: true, referredBy: true,
      birthDate: true, adminMemo: true, lastLoginAt: true,
      createdAt: true, updatedAt: true,
      _count: { select: { chatMessages: true, attendances: true, pointExchanges: true, bjChatMessages: true, analysisPosts: true, accessLogs: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 레벨, 의심점수, 추천 피라미드, 추가 통계 — 병렬
  const [level, suspicion, pyramid, loginCount, lastLogin, lastVisit, totalChats, recentBan, eventStats] = await Promise.all([
    calculateLevel(user.exp),
    calculateSuspicionScore(id),
    getReferralPyramid(id),
    prisma.accessLog.count({ where: { userId: id, type: "login" } }),
    prisma.accessLog.findFirst({ where: { userId: id, type: "login" }, orderBy: { createdAt: "desc" }, select: { createdAt: true, ip: true, device: true, browser: true, os: true } }),
    prisma.accessLog.findFirst({ where: { userId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true, ip: true, path: true } }),
    Promise.resolve(user._count.chatMessages + user._count.bjChatMessages),
    prisma.bjChatBan.count({ where: { userId: id } }),
    prisma.user.findUnique({ where: { id }, select: { eventStreak: true, eventBestStreak: true } }),
  ]);

  return NextResponse.json({
    ...user,
    birthDate: user.birthDate?.toISOString().slice(0, 10) || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() || null,
    level,
    suspicion,
    pyramid,
    counts: {
      mainChats: user._count.chatMessages,
      bjChats: user._count.bjChatMessages,
      totalChats,
      attendances: user._count.attendances,
      exchanges: user._count.pointExchanges,
      analyses: user._count.analysisPosts,
      logins: loginCount,
      visits: user._count.accessLogs,
      chatBans: recentBan,
    },
    lastLogin: lastLogin ? { ...lastLogin, createdAt: lastLogin.createdAt.toISOString() } : null,
    lastVisit: lastVisit ? { ...lastVisit, createdAt: lastVisit.createdAt.toISOString() } : null,
    eventStats: eventStats || { eventStreak: 0, eventBestStreak: 0 },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const id = parseInt(params.id);

  // SUPERADMIN 등급은 SUPERADMIN만 부여 가능
  if (body.role === "SUPERADMIN" && session.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "최고관리자만 SUPERADMIN 등급을 부여할 수 있습니다." }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};

  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.points !== undefined) data.points = body.points;
  if (body.exp !== undefined) data.exp = body.exp;
  if (body.nickname !== undefined) data.nickname = body.nickname;
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.adminMemo !== undefined) data.adminMemo = String(body.adminMemo).slice(0, 5000);

  // 비밀번호 초기화
  if (body.resetPassword) {
    data.password = await bcrypt.hash("1234", 10);
  }

  // 포인트 수동 조정 시 로그 기록 (잔액 포함)
  if (body.pointAdjust) {
    const amount = parseInt(body.pointAdjust.amount);
    const reason = body.pointAdjust.reason || "관리자 수동 조정";
    const user = await prisma.user.findUnique({ where: { id }, select: { points: true } });
    if (user) {
      const newBalance = user.points + amount;
      data.points = newBalance;
      await prisma.pointLog.create({
        data: { userId: id, type: amount >= 0 ? "EARN" : "DEDUCT", amount: Math.abs(amount), reason, balance: newBalance },
      });
    }
  }

  // 경험치 수동 조정
  if (body.expAdjust) {
    const amount = parseInt(body.expAdjust.amount);
    const user = await prisma.user.findUnique({ where: { id }, select: { exp: true } });
    if (user) {
      data.exp = Math.max(0, user.exp + amount);
    }
  }

  const updated = await prisma.user.update({ where: { id }, data });

  await adminLog({ action: "user.update", target: `userId:${id}`, detail: body });

  return NextResponse.json({ ok: true, user: { id: updated.id, role: updated.role, points: updated.points, isActive: updated.isActive } });
}

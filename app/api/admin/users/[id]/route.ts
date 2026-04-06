import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(params.id) },
    select: {
      id: true, username: true, nickname: true, role: true,
      points: true, exp: true, isActive: true,
      name: true, phone: true, email: true, referredBy: true,
      createdAt: true, updatedAt: true,
      pointLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      pointExchanges: { orderBy: { createdAt: "desc" }, take: 10 },
      _count: { select: { chatMessages: true, attendances: true, pointExchanges: true } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
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
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.email !== undefined) data.email = body.email || null;

  // 비밀번호 초기화
  if (body.resetPassword) {
    data.password = await bcrypt.hash("1234", 10);
  }

  // 포인트 수동 조정 시 로그 기록
  if (body.pointAdjust) {
    const amount = parseInt(body.pointAdjust.amount);
    const reason = body.pointAdjust.reason || "관리자 수동 조정";
    const user = await prisma.user.findUnique({ where: { id }, select: { points: true } });
    if (user) {
      data.points = user.points + amount;
      await prisma.pointLog.create({
        data: {
          userId: id,
          type: amount >= 0 ? "EARN" : "DEDUCT",
          amount: Math.abs(amount),
          reason,
        },
      });
    }
  }

  const updated = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true, user: { id: updated.id, role: updated.role, points: updated.points, isActive: updated.isActive } });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const id = parseInt(params.id);
  const data: Record<string, unknown> = {};
  if (body.status) data.status = body.status;
  if (body.memo !== undefined) data.memo = body.memo;

  // 취소 시 포인트 환불
  if (body.status === "CANCELLED") {
    const exchange = await prisma.pointExchange.findUnique({ where: { id } });
    if (exchange && exchange.status !== "CANCELLED") {
      await prisma.user.update({ where: { id: exchange.userId }, data: { points: { increment: exchange.amount } } });
      await prisma.pointLog.create({ data: { userId: exchange.userId, type: "EARN", amount: exchange.amount, reason: `교환 취소 환불 (#${id})` } });
    }
  }

  const updated = await prisma.pointExchange.update({ where: { id }, data });
  return NextResponse.json(updated);
}

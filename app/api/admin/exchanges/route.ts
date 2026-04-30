export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status) where.status = status;

  const exchanges = await prisma.pointExchange.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, nickname: true, username: true } } },
    take: 100,
  });
  const counts = {
    all: await prisma.pointExchange.count(),
    PENDING: await prisma.pointExchange.count({ where: { status: "PENDING" } }),
    PROCESSING: await prisma.pointExchange.count({ where: { status: "PROCESSING" } }),
    COMPLETED: await prisma.pointExchange.count({ where: { status: "COMPLETED" } }),
    CANCELLED: await prisma.pointExchange.count({ where: { status: "CANCELLED" } }),
  };
  return NextResponse.json({ exchanges, counts });
}

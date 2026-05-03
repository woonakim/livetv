export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 접속/로그인 기록 — type=login만 / 전체 / 페이지네이션
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("type") || "all"; // all | login | visit
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));

  const where: Record<string, unknown> = { userId: id };
  if (filter === "login") where.type = "login";
  if (filter === "visit") where.type = "visit";

  const [items, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, type: true, ip: true, userAgent: true, device: true, browser: true, os: true, referer: true, path: true, createdAt: true },
    }),
    prisma.accessLog.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(x => ({ ...x, createdAt: x.createdAt.toISOString() })),
    total, page, limit,
  });
}

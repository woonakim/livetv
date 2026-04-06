import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const type = url.searchParams.get("type") || "";
  const search = url.searchParams.get("search") || "";
  const limit = 50;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (type) where.type = type;
  if (search) {
    where.user = { OR: [{ nickname: { contains: search, mode: "insensitive" } }, { username: { contains: search, mode: "insensitive" } }] };
  }

  const [logs, total] = await Promise.all([
    prisma.pointLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, nickname: true, username: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pointLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
}

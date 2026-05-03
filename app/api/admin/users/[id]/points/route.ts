export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(200, parseInt(searchParams.get("limit") || "50"));
  const type = searchParams.get("type") || ""; // EARN | DEDUCT | EXCHANGE
  const search = (searchParams.get("search") || "").trim();

  const where: Record<string, unknown> = { userId: id };
  if (type) where.type = type;
  if (search) where.reason = { contains: search };

  const [items, total] = await Promise.all([
    prisma.pointLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.pointLog.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map(x => ({ ...x, createdAt: x.createdAt.toISOString() })),
    total, page, limit,
  });
}

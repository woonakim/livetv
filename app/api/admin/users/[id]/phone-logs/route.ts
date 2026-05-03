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
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));

  const [items, total] = await Promise.all([
    prisma.phoneVerificationLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.phoneVerificationLog.count({ where: { userId: id } }),
  ]);

  return NextResponse.json({
    items: items.map(x => ({ ...x, createdAt: x.createdAt.toISOString() })),
    total, page, limit,
  });
}

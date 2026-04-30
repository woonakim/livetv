export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN", "DEVELOPER"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const successOnly = searchParams.get("successOnly") === "1";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (search) {
    where.OR = [
      { nickname: { contains: search } },
      { phone: { contains: search } },
      { ip: { contains: search } },
    ];
  }
  if (type) where.type = type;
  if (successOnly) where.success = true;

  const [logs, total] = await Promise.all([
    prisma.phoneVerificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.phoneVerificationLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id, userId: l.userId, nickname: l.nickname,
      phone: l.phone, success: l.success, type: l.type, ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const levels = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  return NextResponse.json(levels);
}

// 일괄 수정
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const levels: { level: number; name: string; requiredExp: number; badge: string; color?: string; bgColor?: string }[] = body.levels;

  if (!Array.isArray(levels)) return NextResponse.json({ error: "잘못된 데이터" }, { status: 400 });

  for (const l of levels) {
    await prisma.levelSetting.upsert({
      where: { level: l.level },
      create: { level: l.level, name: l.name, requiredExp: l.requiredExp, badge: l.badge, color: l.color || "", bgColor: l.bgColor || "" },
      update: { name: l.name, requiredExp: l.requiredExp, badge: l.badge, color: l.color || "", bgColor: l.bgColor || "" },
    });
  }

  return NextResponse.json({ ok: true });
}

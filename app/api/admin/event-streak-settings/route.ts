export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const list = await prisma.eventStreakSetting.findMany({ orderBy: { threshold: "asc" } });
  return NextResponse.json(list);
}

// 새 단계 생성 또는 기존 단계 수정 (threshold가 unique이므로 upsert)
// isActive는 명시적으로 전달된 경우에만 update — partial update 시 강제 활성화 방지
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const body = await req.json();
  const threshold = parseInt(body.threshold);
  if (!threshold || threshold < 1) return NextResponse.json({ error: "threshold는 1 이상" }, { status: 400 });

  const points = parseInt(body.points) || 0;
  const exp = parseInt(body.exp) || 0;
  const updateData: { threshold: number; points: number; exp: number; isActive?: boolean } = { threshold, points, exp };
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;

  const createData = { threshold, points, exp, isActive: typeof body.isActive === "boolean" ? body.isActive : true };

  const row = await prisma.eventStreakSetting.upsert({
    where: { threshold },
    update: updateData,
    create: createData,
  });
  await adminLog({ action: "event_streak.upsert", target: `threshold:${threshold}`, detail: { threshold, points, exp, isActive: updateData.isActive } });
  return NextResponse.json(row);
}

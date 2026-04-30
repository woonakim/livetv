export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { adminLog } from "@/lib/admin-log";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ threshold: string }> }) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const { threshold } = await params;
  const t = parseInt(threshold);
  if (!t) return NextResponse.json({ error: "잘못된 threshold" }, { status: 400 });
  await prisma.eventStreakSetting.delete({ where: { threshold: t } }).catch(() => {});
  await adminLog({ action: "event_streak.delete", target: `threshold:${t}` });
  return NextResponse.json({ ok: true });
}

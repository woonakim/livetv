export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 최근 30일 일별 활동량 (히트맵용)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // 채팅 / 출석 / 접속 카운트를 raw SQL로 일별 집계
  const [chats, bjChats, visits, attendances] = await Promise.all([
    prisma.$queryRaw<{ d: string; c: bigint }[]>`
      SELECT TO_CHAR(("createdAt" AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS d, COUNT(*) AS c
      FROM "ChatMessage" WHERE "userId" = ${id} AND "createdAt" >= ${since}
      GROUP BY d ORDER BY d
    `,
    prisma.$queryRaw<{ d: string; c: bigint }[]>`
      SELECT TO_CHAR(("createdAt" AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS d, COUNT(*) AS c
      FROM "BjChatMessage" WHERE "userId" = ${id} AND "createdAt" >= ${since}
      GROUP BY d ORDER BY d
    `,
    prisma.$queryRaw<{ d: string; c: bigint }[]>`
      SELECT TO_CHAR(("createdAt" AT TIME ZONE 'Asia/Seoul')::date, 'YYYY-MM-DD') AS d, COUNT(*) AS c
      FROM "AccessLog" WHERE "userId" = ${id} AND "createdAt" >= ${since}
      GROUP BY d ORDER BY d
    `,
    prisma.attendance.findMany({
      where: { userId: id, date: { gte: since } },
      select: { date: true },
    }),
  ]);

  const byDate = new Map<string, { chats: number; visits: number; attended: boolean }>();
  for (const r of chats) {
    const k = r.d;
    if (!byDate.has(k)) byDate.set(k, { chats: 0, visits: 0, attended: false });
    byDate.get(k)!.chats += Number(r.c);
  }
  for (const r of bjChats) {
    const k = r.d;
    if (!byDate.has(k)) byDate.set(k, { chats: 0, visits: 0, attended: false });
    byDate.get(k)!.chats += Number(r.c);
  }
  for (const r of visits) {
    const k = r.d;
    if (!byDate.has(k)) byDate.set(k, { chats: 0, visits: 0, attended: false });
    byDate.get(k)!.visits += Number(r.c);
  }
  for (const a of attendances) {
    const k = a.date.toISOString().slice(0, 10);
    if (!byDate.has(k)) byDate.set(k, { chats: 0, visits: 0, attended: false });
    byDate.get(k)!.attended = true;
  }

  // 최근 30일 dense array
  const days: { date: string; chats: number; visits: number; attended: boolean; total: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // KST 일자
    const kst = new Date(d.getTime() + 9 * 3600 * 1000);
    const key = kst.toISOString().slice(0, 10);
    const v = byDate.get(key) || { chats: 0, visits: 0, attended: false };
    days.push({ date: key, chats: v.chats, visits: v.visits, attended: v.attended, total: v.chats + v.visits + (v.attended ? 1 : 0) });
  }

  return NextResponse.json({ days });
}

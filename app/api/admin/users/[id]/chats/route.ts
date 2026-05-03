export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 채팅 내역 — 메인 채팅 + BJ 채팅 union (시간순)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("type") || "all"; // all | main | bj
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50"));
  const offset = (page - 1) * limit;

  const items: { id: string; channel: string; bjNickname?: string; text: string; isPinned: boolean; createdAt: string }[] = [];
  let total = 0;

  if (filter === "main" || filter === "all") {
    const [main, mainCount] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: filter === "main" ? limit : limit * 2,
        skip: filter === "main" ? offset : 0,
      }),
      prisma.chatMessage.count({ where: { userId: id } }),
    ]);
    total += mainCount;
    for (const m of main) items.push({ id: `m_${m.id}`, channel: "메인", text: m.text, isPinned: m.isPinned, createdAt: m.createdAt.toISOString() });
  }

  if (filter === "bj" || filter === "all") {
    const [bj, bjCount] = await Promise.all([
      prisma.bjChatMessage.findMany({
        where: { userId: id },
        include: { bjProfile: { include: { user: { select: { nickname: true } } } } },
        orderBy: { createdAt: "desc" },
        take: filter === "bj" ? limit : limit * 2,
        skip: filter === "bj" ? offset : 0,
      }),
      prisma.bjChatMessage.count({ where: { userId: id } }),
    ]);
    total += bjCount;
    for (const m of bj) items.push({
      id: `b_${m.id}`,
      channel: `BJ:${m.bjProfile.user.nickname}`,
      bjNickname: m.bjProfile.user.nickname,
      text: m.text,
      isPinned: m.isPinned,
      createdAt: m.createdAt.toISOString(),
    });
  }

  // all 모드에서 시간 정렬 후 페이지네이션
  if (filter === "all") {
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ items: items.slice(offset, offset + limit), total, page, limit });
  }

  return NextResponse.json({ items, total, page, limit });
}

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 이 회원이 채팅 차단당한 이력 (BJ별)
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = parseInt(params.id);

  const items = await prisma.bjChatBan.findMany({
    where: { userId: id },
    include: { bjProfile: { include: { user: { select: { nickname: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    items: items.map(b => ({
      id: b.id,
      bjNickname: b.bjProfile.user.nickname,
      createdAt: b.createdAt.toISOString(),
    })),
    total: items.length,
  });
}

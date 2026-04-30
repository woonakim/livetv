export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// 메시지 고정/해제 (ADMIN, SUPERADMIN만 가능)
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
  }

  const { messageId, pin } = await request.json();
  if (!messageId) {
    return NextResponse.json({ error: "메시지 ID가 필요합니다" }, { status: 400 });
  }

  // 고정 시 최대 3개 제한
  if (pin) {
    const pinnedCount = await prisma.chatMessage.count({ where: { isPinned: true } });
    if (pinnedCount >= 3) {
      return NextResponse.json({ error: "최대 3개까지 고정할 수 있습니다" }, { status: 400 });
    }
  }

  const message = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { isPinned: !!pin },
  });

  return NextResponse.json(message);
}

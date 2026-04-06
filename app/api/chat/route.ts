import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { grantReward } from "@/lib/reward";

// 최근 메시지 50개 + 고정 메시지 조회
export async function GET() {
  const [messages, pinned] = await Promise.all([
    prisma.chatMessage.findMany({
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.chatMessage.findMany({
      where: { isPinned: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);
  return NextResponse.json({ messages, pinned });
}

// 메시지 전송
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }
  if (text.trim().length > 100) {
    return NextResponse.json({ error: "100자 이내로 입력해주세요" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      userId: session.id,
      nickname: session.nickname,
      role: session.role as "USER" | "PICKSTER" | "BJ" | "ADMIN" | "SUPERADMIN",
      text: text.trim(),
    },
  });

  // 채팅 보상 (비동기, 응답 지연 안 시킴)
  grantReward(session.id, "chat", "채팅 보상").catch(() => {});

  return NextResponse.json(message, { status: 201 });
}

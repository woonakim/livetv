export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { grantChatReward } from "@/lib/reward";
import { chatLimiter } from "@/lib/rate-limit";

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
  const ip = (request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown");
  const { ok } = chatLimiter.check(ip);
  if (!ok) {
    return NextResponse.json({ error: "메시지를 너무 빨리 보내고 있습니다." }, { status: 429 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }
  const trimmed = text.trim();
  if (trimmed.length > 100) {
    return NextResponse.json({ error: "100자 이내로 입력해주세요" }, { status: 400 });
  }

  // 보상 가능 여부 사전 결정 — INSERT 전에 직전 메시지와 중복 비교
  const setting = await prisma.siteSetting.findUnique({
    where: { id: 1 },
    select: { chatDuplicateBlockEnabled: true },
  });
  let rewardEligible = true;
  if (setting?.chatDuplicateBlockEnabled) {
    const last = await prisma.chatMessage.findFirst({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      select: { text: true },
    });
    if (last && last.text.trim() === trimmed) rewardEligible = false;
  }

  const message = await prisma.chatMessage.create({
    data: {
      userId: session.id,
      nickname: session.nickname,
      role: session.role as "USER" | "PICKSTER" | "BJ" | "ADMIN" | "SUPERADMIN",
      text: trimmed,
    },
  });

  // 채팅 보상 — 캡/글자수 적용 (중복은 위에서 이미 판정, 비동기)
  if (rewardEligible) {
    grantChatReward(session.id, trimmed).catch(() => {});
  }

  return NextResponse.json(message, { status: 201 });
}

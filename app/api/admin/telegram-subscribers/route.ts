export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const list = await prisma.telegramSubscriber.findMany({ orderBy: { subscribedAt: "desc" } });
  return NextResponse.json(list);
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.role)) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  const chatId = req.nextUrl.searchParams.get("chatId");
  if (!chatId) return NextResponse.json({ error: "chatId 필요" }, { status: 400 });
  await prisma.telegramSubscriber.delete({ where: { chatId } }).catch(() => {});
  return NextResponse.json({ ok: true });
}

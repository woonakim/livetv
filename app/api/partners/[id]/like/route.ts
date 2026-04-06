export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// GET: 좋아요 상태 확인
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  const id = parseInt(params.id);

  if (!session) return NextResponse.json({ liked: false });

  const existing = await prisma.partnerLike.findUnique({
    where: { partnerId_userId: { partnerId: id, userId: session.id } },
  });

  return NextResponse.json({ liked: !!existing });
}

// POST: 좋아요 토글 (있으면 삭제, 없으면 추가)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get("livetv_token")?.value;
  const session = token ? verifyToken(token) : null;
  if (!session) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });

  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) return NextResponse.json({ error: "업체 없음" }, { status: 404 });

  const existing = await prisma.partnerLike.findUnique({
    where: { partnerId_userId: { partnerId: id, userId: session.id } },
  });

  if (existing) {
    // 좋아요 취소
    await prisma.$transaction([
      prisma.partnerLike.delete({ where: { id: existing.id } }),
      prisma.partner.update({ where: { id }, data: { likes: { decrement: 1 } } }),
    ]);
    const updated = await prisma.partner.findUnique({ where: { id } });
    return NextResponse.json({ liked: false, likes: updated?.likes ?? 0 });
  } else {
    // 좋아요
    await prisma.$transaction([
      prisma.partnerLike.create({ data: { partnerId: id, userId: session.id } }),
      prisma.partner.update({ where: { id }, data: { likes: { increment: 1 } } }),
    ]);
    const updated = await prisma.partner.findUnique({ where: { id } });
    return NextResponse.json({ liked: true, likes: updated?.likes ?? 0 });
  }
}

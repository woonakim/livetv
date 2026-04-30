export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  const notice = await prisma.notice.findUnique({ where: { id, isActive: true } });
  if (!notice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // 조회수 증가
  await prisma.notice.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  return NextResponse.json(notice);
}

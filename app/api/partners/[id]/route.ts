export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await prisma.partner.findUnique({ where: { id: Number(id) } });
  if (!partner) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // 조회수 증가
  await prisma.partner.update({ where: { id: Number(id) }, data: { views: { increment: 1 } } });
  return NextResponse.json({ ...partner, views: partner.views + 1 });
}

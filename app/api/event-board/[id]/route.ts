export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.eventBoard.findUnique({ where: { id: Number(id) } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.eventBoard.update({ where: { id: Number(id) }, data: { viewCount: { increment: 1 } } });
  return NextResponse.json({ ...post, viewCount: post.viewCount + 1 });
}

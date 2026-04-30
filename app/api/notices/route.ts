export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { id: "desc" }],
    select: { id: true, title: true, author: true, isPinned: true, viewCount: true, createdAt: true },
  });
  return NextResponse.json(notices);
}

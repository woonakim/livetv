import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const posts = await prisma.eventBoard.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(posts);
}

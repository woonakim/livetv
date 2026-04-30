export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { votes: true } } },
  });
  return NextResponse.json(events);
}

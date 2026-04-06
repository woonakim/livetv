import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 공개: 활성 팝업 목록 (기간 내)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const nowDate = new Date();
  const popups = await prisma.popup.findMany({
    where: {
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: nowDate }, endDate: null },
        { startDate: null, endDate: { gte: nowDate } },
        { startDate: { lte: nowDate }, endDate: { gte: nowDate } },
      ],
    },
    orderBy: { sort: "asc" },
  });

  cache = { data: popups, ts: now };
  return NextResponse.json(popups);
}

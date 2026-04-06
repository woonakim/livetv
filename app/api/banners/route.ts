import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 공개: 활성 배너 목록
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1분

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
  });

  cache = { data: banners, ts: now };
  return NextResponse.json(banners);
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// 공개: 레벨 목록 (5분 메모리 캐시)
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }
  const levels = await prisma.levelSetting.findMany({ orderBy: { level: "asc" } });
  cache = { data: levels, ts: now };
  return NextResponse.json(levels);
}

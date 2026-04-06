import { NextRequest, NextResponse } from "next/server";
import { fetchSportsLiveData } from "@/lib/sports-live";

// 1분 캐시
let cache: { data: unknown; ts: number; key?: string } | null = null;
const CACHE_TTL = 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") || "";

  const now = Date.now();
  const cacheKey = sport;

  if (cache && now - cache.ts < CACHE_TTL && cache.key === cacheKey) {
    return NextResponse.json(cache.data);
  }

  try {
    const result = await fetchSportsLiveData(sport);
    cache = { data: result, ts: now, key: cacheKey };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(cache?.data ?? { live: [], waiting: [] });
  }
}

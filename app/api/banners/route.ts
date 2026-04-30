export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/cache-store";

const CACHE_KEY = "banners";
const CACHE_TTL = 60 * 1000;

export async function GET() {
  const cached = getCache(CACHE_KEY, CACHE_TTL);
  if (cached) return NextResponse.json(cached);

  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sort: "asc" },
  });

  setCache(CACHE_KEY, banners);
  return NextResponse.json(banners);
}

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getCache, setCache } from "@/lib/cache-store";

const CACHE_KEY = "popups";
const CACHE_TTL = 60 * 1000;

export async function GET() {
  const cached = getCache(CACHE_KEY, CACHE_TTL);
  if (cached) return NextResponse.json(cached);

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

  setCache(CACHE_KEY, popups);
  return NextResponse.json(popups);
}

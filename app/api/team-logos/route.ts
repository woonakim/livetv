import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


// 팀 로고 목록 반환 (캐싱: 1시간)
export async function GET() {
  const teams = await prisma.teamLogo.findMany({
    where: { isActive: true },
    select: { nameKr: true, nameEn: true, logoPath: true },
  });

  // { "LG": "/team-logos/LG.png", "KIA": "/team-logos/KIA.png", ... }
  const logoMap: Record<string, string> = {};
  for (const t of teams) {
    logoMap[t.nameKr] = t.logoPath;
    if (t.nameEn) logoMap[t.nameEn] = t.logoPath;
  }

  return NextResponse.json(logoMap, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
  });
}

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";


// 팀 로고 목록 반환 (캐싱: 1시간)
export async function GET() {
  const teams = await prisma.teamLogo.findMany({
    where: { isActive: true },
    select: { nameKr: true, nameEn: true, sport: true, logoPath: true },
  });

  // 동명 다종목 충돌 감지: 같은 nameKr이 여러 sport에 등록된 경우 sport 없는 bare 키는 노출 X
  // ("애틀랜타": baseball Braves vs basketball Hawks 충돌 시 NBA 경기에 MLB 로고 표시 방지)
  const krSports = new Map<string, Set<string>>();
  for (const t of teams) {
    if (!t.logoPath) continue;
    if (!krSports.has(t.nameKr)) krSports.set(t.nameKr, new Set());
    krSports.get(t.nameKr)!.add(t.sport || "");
  }

  // { "LG": "/team-logos/LG.png", "baseball:LG": "/team-logos/LG.png", ... }
  const logoMap: Record<string, string> = {};
  for (const t of teams) {
    if (!t.logoPath) continue;
    const ambiguous = (krSports.get(t.nameKr)?.size ?? 1) > 1;

    // 기본: 팀명 → 로고 (모호하지 않을 때만 bare 키 노출)
    if (!ambiguous) {
      logoMap[t.nameKr] = t.logoPath;
      if (t.nameEn) logoMap[t.nameEn] = t.logoPath;
    }
    // sport 키: "종목:팀명" → 로고 (정확 매칭, 동명팀 구분)
    if (t.sport) {
      logoMap[`${t.sport}:${t.nameKr}`] = t.logoPath;
      if (t.nameEn) logoMap[`${t.sport}:${t.nameEn}`] = t.logoPath;
    }
    // 공백 제거 버전 (예: "맨시티" ↔ "맨 시티")
    const noSpace = t.nameKr.replace(/\s/g, "");
    if (noSpace !== t.nameKr) {
      if (!ambiguous) logoMap[noSpace] = t.logoPath;
      if (t.sport) logoMap[`${t.sport}:${noSpace}`] = t.logoPath;
    }
    // 공백 추가 버전 (2글자+나머지 패턴: "AS로마" → "AS 로마")
    const spaced = t.nameKr.replace(/^([A-Z]{2,})([가-힣])/, "$1 $2");
    if (spaced !== t.nameKr) {
      if (!ambiguous) logoMap[spaced] = t.logoPath;
      if (t.sport) logoMap[`${t.sport}:${spaced}`] = t.logoPath;
    }
  }

  return NextResponse.json(logoMap);
}
